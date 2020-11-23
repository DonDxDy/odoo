# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging
from werkzeug import urls

from odoo import api, models, _
from odoo.exceptions import ValidationError
from odoo.tools.float_utils import float_compare

from odoo.addons.payment_buckaroo.controllers.main import BuckarooController

_logger = logging.getLogger(__name__)


def normalize_keys_upper(data):
    """Set all keys of a dictionnary to uppercase

    Buckaroo parameters names are case insensitive
    convert everything to upper case to be able to easily detected the presence
    of a parameter by checking the uppercase key only
    """
    return {key.upper(): val for key, val in data.items()}


class TxBuckaroo(models.Model):
    _inherit = 'payment.transaction'

    # buckaroo status
    _buckaroo_valid_tx_status = [190]
    _buckaroo_pending_tx_status = [790, 791, 792, 793]
    _buckaroo_cancel_tx_status = [890, 891]
    _buckaroo_error_tx_status = [490, 491, 492]
    _buckaroo_reject_tx_status = [690]

    def _get_specific_rendering_values(self, _processing_values):
        self.ensure_one()
        if self.provider != 'buckaroo':
            return super()._get_specific_rendering_values(_processing_values)

        base_url = self.acquirer_id._get_base_url()
        buckaroo_tx_values = dict(_processing_values)
        buckaroo_tx_values.update({
            'Brq_websitekey': self.acquirer_id.brq_websitekey,
            'Brq_amount': _processing_values['amount'],
            'Brq_currency': self.currency_id.name or '',
            'Brq_invoicenumber': _processing_values['reference'],
            'brq_test': True if self.acquirer_id.state == 'test' else False,
            'Brq_return': urls.url_join(base_url, BuckarooController._return_url),
            'Brq_returncancel': urls.url_join(base_url, BuckarooController._cancel_url),
            'Brq_returnerror': urls.url_join(base_url, BuckarooController._exception_url),
            'Brq_returnreject': urls.url_join(base_url, BuckarooController._reject_url),
            'Brq_culture': (_processing_values.get('partner_lang') or 'en_US').replace('_', '-'),
            'add_returndata': buckaroo_tx_values.pop('return_url', '') or '',
            'tx_url': self.acquirer_id._get_buckaroo_urls(),
        })
        buckaroo_tx_values['Brq_signature'] = self.acquirer_id._buckaroo_generate_digital_sign('in', buckaroo_tx_values)
        return buckaroo_tx_values

    @api.model
    def _get_tx_from_feedback_data(self, provider, data):
        if provider != 'buckaroo':
            return super()._get_tx_from_feedback_data(provider, data)

        origin_data = dict(data)
        data = normalize_keys_upper(data)
        reference, pay_id, shasign = data.get('BRQ_INVOICENUMBER'), data.get('BRQ_PAYMENT'), data.get('BRQ_SIGNATURE')
        if not reference or not pay_id or not shasign:
            error_msg = _("Buckaroo: received data with missing reference (%s) or pay_id (%s) or shasign (%s)") % (reference, pay_id, shasign)
            _logger.info(error_msg)
            raise ValidationError(error_msg)

        tx = self.search([('reference', '=', reference)])
        if not tx or len(tx) > 1:
            error_msg = _("Buckaroo: received data for reference %s") % (reference)
            if not tx:
                error_msg += _("; no order found")
            else:
                error_msg += _("; multiple order found")
            _logger.info(error_msg)
            raise ValidationError(error_msg)

        # verify shasign
        shasign_check = tx.acquirer_id._buckaroo_generate_digital_sign('out', origin_data)
        if shasign_check.upper() != shasign.upper():
            error_msg = _("Buckaroo: invalid shasign, received %s, computed %s, for data %s") % (shasign, shasign_check, data)
            _logger.info(error_msg)
            raise ValidationError(error_msg)

        return tx

    def _process_feedback_data(self, data):
        self.ensure_one()
        if self.provider != 'buckaroo':
            return super()._process_feedback_data(data)

        data = normalize_keys_upper(data)
        if float_compare(float(data.get('BRQ_AMOUNT', '0.0')), self.amount, 2) != 0:
            raise ValidationError("Buckaroo" + _("The paid amount does not match the total."))
        if data.get('BRQ_CURRENCY') != self.currency_id.name:
            raise ValidationError("Buckaroo" + _("The currency returned by Buckaroo %(rc)s does not match the transaction currency %(tc)s.", rc=data.get('BRQ_CURRENCY'), tc=self.currency_id.name))

        status_code = int(data.get('BRQ_STATUSCODE', '0'))
        if status_code in self._buckaroo_valid_tx_status:
            self.write({'acquirer_reference': data.get('BRQ_TRANSACTIONS')})
            self._set_done()
            return True
        elif status_code in self._buckaroo_pending_tx_status:
            self.write({'acquirer_reference': data.get('BRQ_TRANSACTIONS')})
            self._set_pending()
            return True
        elif status_code in self._buckaroo_cancel_tx_status:
            self.write({'acquirer_reference': data.get('BRQ_TRANSACTIONS')})
            self._set_canceled()
            return True
        else:
            error = 'Buckaroo: feedback error'
            _logger.info(error)
            self.write({
                'state_message': error,
                'acquirer_reference': data.get('BRQ_TRANSACTIONS'),
            })
            self._set_canceled()
            return False
