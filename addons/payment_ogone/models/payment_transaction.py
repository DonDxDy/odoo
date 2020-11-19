# Part of Odoo. See LICENSE file for full copyright and licensing details.

import base64
import datetime
import logging
import time
from pprint import pformat
import re

import requests
from lxml import etree, objectify
from werkzeug import urls

from odoo import api, fields, models, _
from odoo.addons.payment.models.payment_acquirer import ValidationError
from odoo.addons.payment.utils import singularize_reference_prefix
from odoo.addons.payment_ogone.controllers.main import OgoneController
from odoo.addons.payment_ogone.data import ogone
from odoo.http import request
from odoo.tools import ustr
from odoo.tools.float_utils import float_repr, float_round

_logger = logging.getLogger(__name__)


class PaymentTxOgone(models.Model):
    _inherit = 'payment.transaction'
    # ogone status
    _ogone_valid_tx_status = [5, 9, 8]
    _ogone_wait_tx_status = [41, 50, 51, 52, 55, 56, 91, 92, 99]
    _ogone_pending_tx_status = [46, 81, 82]   # 46 = 3DS HTML response
    _ogone_cancel_tx_status = [1]

    ogone_html_3ds = fields.Char('3D Secure HTML')
    ogone_user_error = fields.Char('User Friendly State message ')

    @api.model
    def _compute_reference(self, provider, prefix=None, separator='-', **kwargs):
        # Ogone needs singularized references to avoid triggering errors.
        # They only check the ORDERID to detect duplicate transactions, not the buyer, amount, card etc.
        # We could have problems by using multiple Odoo instances using the same Ogone account.
        # Or if the same reference is used several times
        if provider != 'ogone':
            return super()._compute_reference(provider, prefix, separator, **kwargs)

        prefix = prefix and singularize_reference_prefix(prefix)
        return super()._compute_reference(provider, prefix, separator, **kwargs)

    # --------------------------------------------------
    # BUSINESS METHODS
    # --------------------------------------------------

    @api.model
    def _ogone_clean_keys(self, data):
        # clean dict keys for coherence with directlink API.
        # Thanks to Ogone, the dict keys are different from one API to another but the correct keys are needed
        # to check the signature...
        # 1) Pass keys to uppercase
        # 2) Remove prefix with the dot line "CARD."; "ALIAS." etc
        return {re.sub(r'.*\.', '', key.upper()): val for key, val in data.items()}

    def _ogone_ncerrors_verification(self, data):
        """
        Check that the incoming data coming from the FlexCheckout API are correct.
        :param data: GET parameters of the feedback URL
        :return: None
        """
        # check for errors before using values
        errors = {k: int(v) for k, v in data.items() if k.startswith('NCError') and int(v)}
        if errors:
            self._set_canceled()
            error_fields = ", ".join([ogone.FLEXCHECKOUT_ERROR[key] for key in errors.keys()])
            error_msg = "Ogone: " + _(f"The following parameters could not be validated by Ogone: {error_fields}.")
            raise ValidationError(error_msg)





    @api.model
    def _get_tx_from_feedback_data(self, provider, data):
        """
        Given a data dict coming from ogone, verify it and find the related
        transaction record. Create a payment token if an alias is returned.

        This method is called from two different API: Flexcheckout for token (Alias) creation on Ingenico servers
        and from the DirectLink API when a 3DSV1 verification occurs (with redirection).
        Unfortunately, these two API don't share the same keywords and conventions.

        At this point, the data signature has been validated and we can homogenize the data.
        :param str provider: The provider of the acquirer that handled the transaction
        :param dict data: The feedback data sent by the acquirer
        :return: The transaction if found
        :rtype: recordset of `payment.transaction`
        """
        if provider != 'ogone':
            return super()._get_tx_from_feedback_data(provider, data)
        if data.get('TYPE') == 'flexcheckout':
            data['ALIAS'] = data['ALIASID']
            reference = data.get('REFERENCE')
            # pay_id is not present when returning from fleckcheckout because we just created an alias.
            # Therefore, this field is not blocking
            pay_id = True
        else:
            # type is directlink
            pay_id = data.get('PAYID')
            reference = data.get('ORDERID')

        alias = data.get('ALIAS')
        data_checked = alias and reference and pay_id
        if not data_checked:
            error_msg = "Ogone: " + _('received data with missing values (%s) (%s)') % (reference, alias)
            raise ValidationError(error_msg)

        tx = self.search([('reference', '=', reference)])
        if not tx or len(tx) > 1:
            error_msg = "Ogone: " + _('received data for reference %s', reference)
            if not tx:
                error_msg += _(': no order found')
            else:
                error_msg += _(': multiple order found')
            raise ValidationError(error_msg)
        return tx

    def _process_feedback_data(self, data):
        """ Update the transaction state and the acquirer reference based on the feedback data.
        For an acquirer to handle transaction post-processing, it must overwrite this method and
        process the feedback data.

        Note: self.ensure_one()

        :param dict data: The feedback data sent by the acquirer
        :return: None
        """
        self.ensure_one()
        if self.provider != 'ogone':
            return super()._process_feedback_data(data)

        self._ogone_ncerrors_verification(data)
        if all(key in data for key in ['CARDNUMBER', 'CARDHOLDERNAME']) and data.get('TYPE') == 'flexcheckout':
            # First case: # We are coming back from the flexkcheckout API
            # The token (alias) was created on the Ogone server, we create it here before performing the payment request
            token_vals = {
                'acquirer_id': self.acquirer_id.id,
                'acquirer_ref': data['ALIAS'],
                'partner_id': self.partner_id.id,
                'name': '%s - %s' % (data.get('CARDNUMBER')[-4:], data.get('CARDHOLDERNAME')),
                'verified': False
            }
            if data.get('STOREPERMANENTLY') == 'N':
                # The token shall not be reused, we archive it to avoid listing it
                token_vals.update({'active': False})
            token_id = self.env['payment.token'].create(token_vals)
            self.write({'token_id': token_id})

        else:
            # Second case: we are coming back from the Direct link API with a 3DS redirection
            status = int(data.get('STATUS', '0'))
            if status in self._ogone_valid_tx_status:
                self.write({'acquirer_reference': data.get('PAYID')})
                if self.token_id:
                    self.token_id.verified = True
                    self._set_done()
            elif status in self._ogone_cancel_tx_status:
                self._set_canceled()
            elif status in self._ogone_pending_tx_status or status in self._ogone_wait_tx_status:
                self._set_pending()
            else:
                # There was probably an NCERROR
                _logger.error("Ogone: Could not falidate these data for %s" % pformat(data))
                self._set_canceled()

    # --------------------------------------------------
    # Ogone API RELATED METHODS
    # --------------------------------------------------
    def _send_payment_request(self):
        super()._send_payment_request()  # Log the 'sent' message
        if self.provider != 'ogone':
            return
        account = self.acquirer_id
        reference = self.reference or "ODOO-%s-%s" % (datetime.datetime.now().strftime('%y%m%d_%H%M%S'), self.partner_id.id)
        base_url = self.acquirer_id.get_base_url()
        data = {
            'PSPID': account.ogone_pspid,
            'USERID': account.ogone_userid,
            'PSWD': account.ogone_password,
            'ORDERID': reference,
            'AMOUNT': float_repr(float_round(self.amount, 2) * 100, 0),
            'CURRENCY': self.currency_id.name,
            'OPERATION': 'SAL',
            'ECI': 9,   # Recurring (from eCommerce)
            'ALIAS': self.token_id.acquirer_ref,
            'RTIMEOUT': 30,
            'EMAIL': self.partner_id.email or '',
            'CN': self.partner_id.name or '',
            'ACCEPTURL': urls.url_join(base_url, OgoneController._accept_url),
            'DECLINEURL': urls.url_join(base_url, OgoneController._decline_url),
            'EXCEPTIONURL': urls.url_join(base_url, OgoneController._exception_url),
            'CANCELURL': urls.url_join(base_url, OgoneController._cancel_url),
            'HOMEURL': urls.url_join(base_url, OgoneController._fleckcheckout_final_url),
            'CATALOGURL': urls.url_join(base_url, OgoneController._fleckcheckout_final_url),
        }
        # arj fixme: check if these values can be used to trigger a 3dsv2
        # ogone_tx_values = {
        #     'LANGUAGE': values.get('partner_lang'),
        #     'CN': values.get('partner_name'),
        #     'EMAIL': values.get('partner_email'),
        #     'OWNERZIP': values.get('partner_zip'),
        #     'OWNERADDRESS': values.get('partner_address'),
        #     'OWNERTOWN': values.get('partner_city'),
        #     'OWNERCTY': values.get('partner_country') and values.get('partner_country').code or '',
        # }
        data.update({
            'FLAG3D': 'Y',
            'LANGUAGE': self.partner_id.lang or 'en_US',
            'WIN3DS': 'MAINW',
        })
        if request:
            data['REMOTE_ADDR'] = request.httprequest.remote_addr
        data['SHASIGN'] = self.acquirer_id._ogone_generate_shasign('in', data)

        direct_order_url = self.acquirer_id._ogone_get_urls()['ogone_direct_order_url']

        logged_data = data.copy()
        logged_data.pop('PSWD')
        _logger.info("ogone_payment_request: Sending values to URL %s, values:\n%s", direct_order_url, pformat(logged_data))
        result = requests.post(direct_order_url, data=data).content

        try:
            tree = objectify.fromstring(result)
            _logger.info('ogone_payment_request: Values received:\n%s', etree.tostring(tree, pretty_print=True, encoding='utf-8'))
        except etree.XMLSyntaxError:
            # invalid response from ogone
            _logger.exception('Invalid xml response from ogone')
            _logger.info('ogone_payment_request: Values received:\n%s', result)
            raise
        return self._ogone_validate_tree(tree)

    def _send_refund_request(self, **kwargs):
        account = self.acquirer_id
        reference = self.reference or "ODOO-%s-%s" % (datetime.datetime.now().strftime('%y%m%d_%H%M%S'), self.partner_id.id)
        data = {
            'PSPID': account.sudo().ogone_pspid,
            'USERID': account.sudo().ogone_userid,
            'PSWD': account.sudo().ogone_password,
            'ORDERID': reference,
            'AMOUNT': int(self.amount * 100),
            'CURRENCY': self.currency_id.name,
            'OPERATION': 'RFS',
            'PAYID': self.acquirer_reference,
        }
        data['SHASIGN'] = self.acquirer_id.sudo()._ogone_generate_shasign('in', data)
        refund_order_url = self.acquirer_id._ogone_get_urls()['ogone_maintenance_url']
        logged_data = data.copy()
        logged_data.pop('PSWD')
        _logger.info("ogone_s2s_do_refund: Sending values to URL %s, values:\n%s", refund_order_url, pformat(logged_data))
        result = requests.post(refund_order_url, data=data).content

        try:
            tree = objectify.fromstring(result)
            _logger.info('ogone_s2s_do_refund: Values received:\n%s', etree.tostring(tree, pretty_print=True, encoding='utf-8'))
        except etree.XMLSyntaxError:
            # invalid response from ogone
            _logger.exception('Invalid xml response from ogone')
            _logger.info('ogone_s2s_do_refund: Values received:\n%s', result)
            self.state_message = str(result)
            raise

        return self._ogone_validate_tree(tree)

    def _ogone_validate_tree(self, tree, tries=2):
        if self.state not in ['draft', 'pending']:
            _logger.info('Ogone: trying to validate an already validated tx (ref %s)', self.reference)
            return True

        status = int(tree.get('STATUS') or 0)
        if status in self._ogone_valid_tx_status:
            self.write({
                'acquirer_reference': tree.get('PAYID'),
            })
            if self.token_id:
                self.token_id.verified = True
            self._set_done()
            return True
        elif status in self._ogone_cancel_tx_status:
            self.write({'acquirer_reference': tree.get('PAYID')})
            self._set_canceled()
        elif status in self._ogone_pending_tx_status:
            vals = {
                'acquirer_reference': tree.get('PAYID'),
            }
            if status == 46: # HTML 3DS
                vals['ogone_html_3ds'] = ustr(base64.b64decode(tree.HTML_ANSWER.text))
            self.write(vals)
            self._set_pending()
            return False
        elif status in self._ogone_wait_tx_status and tries > 0:
            time.sleep(0.5)
            self.write({'acquirer_reference': tree.get('PAYID')})
            tree = self._ogone_api_get_tx_status()
            return self._ogone_validate_tree(tree, tries - 1)
        else:
            error = 'Ogone: feedback error: %(error_str)s\n\n%(error_code)s: %(error_msg)s' % {
                'error_str': tree.get('NCERRORPLUS'),
                'error_code': tree.get('NCERROR'),
                'error_msg': ogone.OGONE_ERROR_MAP.get(tree.get('NCERROR')),
            }

            _logger.info(error)
            self.write({
                'state_message': error,
                'acquirer_reference': tree.get('PAYID'),
                'ogone_user_error':  _("%s" % ogone.OGONE_ERROR_MAP.get(tree.get('NCERROR'))),
            })
            self._set_canceled()
            return False

    def _ogone_api_get_tx_status(self):
        account = self.acquirer_id
        #reference = tx.reference or "ODOO-%s-%s" % (datetime.datetime.now().strftime('%Y%m%d_%H%M%S'), tx.partner_id.id)
        data = {
            'PAYID': self.acquirer_reference,
            'PSPID': account.ogone_pspid,
            'USERID': account.ogone_userid,
            'PSWD': account.ogone_password,
        }

        query_direct_url = 'https://secure.ogone.com/ncol/%s/querydirect.asp' % ('prod' if self.acquirer_id.state == 'enabled' else 'test')

        logged_data = data.copy()
        logged_data.pop('PSWD')

        _logger.info("_ogone_api_get_tx_status: Sending values to URL %s, values:\n%s", query_direct_url, pformat(logged_data))
        result = requests.post(query_direct_url, data=data).content

        try:
            tree = objectify.fromstring(result)
            _logger.info('_ogone_api_get_tx_status: Values received:\n%s', etree.tostring(tree, pretty_print=True, encoding='utf-8'))
        except etree.XMLSyntaxError:
            # invalid response from ogone
            _logger.exception('Invalid xml response from ogone')
            _logger.info('_ogone_api_get_tx_status: Values received:\n%s', result)
            raise

        return tree
