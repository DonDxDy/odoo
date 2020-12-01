# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging

from odoo import api, models, _
from odoo.addons.payment.utils import singularize_reference_prefix
from odoo.addons.payment_payulatam.controllers.main import PayuLatamController
from odoo.exceptions import ValidationError
from odoo.tools.float_utils import float_compare, float_repr

from werkzeug import urls


_logger = logging.getLogger(__name__)


class PaymentTransaction(models.Model):
    _inherit = 'payment.transaction'

    @api.model
    def _compute_reference(self, provider, prefix=None, separator="-", **kwargs):
        if provider == 'payulatam':
            prefix = singularize_reference_prefix(separator='')
        return super()._compute_reference(provider, prefix, separator, **kwargs)

    @api.model
    def _get_tx_from_feedback_data(self, provider, data):
        """ Given a data dict coming from payulatam, verify it and find the related
        transaction record. """
        if provider != 'payulatam':
            return super()._get_tx_from_feedback_data(provider, data)

        reference, txnid, sign = data.get('referenceCode'), data.get('transactionId'), data.get('signature')
        if not reference or not txnid or not sign:
            raise ValidationError(
                "PayU Latam: " + _('received data with missing reference (%(ref)s) or transaction id (%(tx)s) or sign (%(sign)s)', ref=reference, tx=txnid, sign=sign))

        transaction = self.search([('reference', '=', reference)])
        if not transaction:
            raise ValidationError("PayU Latam: " + _('received data for reference %(ref)s; no order found', ref=reference))

        # verify shasign
        sign_check = transaction.acquirer_id._payulatam_generate_sign('out', data)
        if sign_check.upper() != sign.upper():
            raise ValidationError("PayU Latam: " + _('invalid sign, received %(sign)s, computed %(check)s, for data %(data)s', sign=sign, check=sign_check, data=data))

        return transaction

    def _process_feedback_data(self, data):
        self.ensure_one()
        if self.provider != "payulatam":
            return super()._process_feedback_data(data)

        self.acquirer_reference = data.get('transactionId') or data.find('transactionResponse').find('transactionId').text
        self.state_message = data.get('message') or ""

        status = data.get('lapTransactionState') or data.find('transactionResponse').find('state').text
        if status == 'APPROVED':
            _logger.info('PayU Latam: Validated payment for tx %s: %s set as done', self.reference, status)
            self._set_done()
        elif status == 'PENDING':
            _logger.info('PayU Latam: Received notification payment for tx %s: %s set as pending', self.reference, status)
            self._set_pending()
        elif status in ['EXPIRED', 'DECLINED']:
            _logger.info('Payu Latam: Received notification payment for tx %s: %s set as cancel', self.reference, status)
            self._set_canceled()
        else:
            _logger.info('PayU Latam: Received unrecognized status payment %s: %s, set as error', self.reference, status)
            self._set_error(_("Invalid payment status received from PayU Latam"))

    def _get_specific_rendering_values(self, _processing_values):
        self.ensure_one()
        if self.provider != "payulatam":
            return super()._get_specific_rendering_values(_processing_values)

        currency = self.env['res.currency'].browse(_processing_values.get('currency_id'))
        partner = self.env['res.partner']
        if _processing_values.get('partner_id'):
            partner = self.env['res.partner'].browse(_processing_values.get('partner_id'))

        payulatam_values = dict(
            _processing_values,
            merchantId=self.acquirer_id.payulatam_merchant_id,
            accountId=self.acquirer_id.payulatam_account_id,
            description=_processing_values.get('reference'),
            referenceCode=_processing_values.get('reference'),
            amount=float_repr(_processing_values['amount'], currency.decimal_places or 2),
            tax='0',  # This is the transaction VAT. If VAT zero is sent the system, 19% will be applied automatically. It can contain two decimals. Eg 19000.00. In the where you do not charge VAT, it should be set as 0.
            taxReturnBase='0',
            currency=currency.name,
            buyerEmail=partner.email,
            buyerFullName=partner.name,
            responseUrl=urls.url_join(self.get_base_url(), PayuLatamController._response_url),
        )

        if self.acquirer_id.state != 'enabled':
            payulatam_values['test'] = 1

        payulatam_values['redirect_url'] = self.acquirer_id._payulatam_get_redirect_url()
        payulatam_values['signature'] = self.acquirer_id._payulatam_generate_sign("in", payulatam_values)

        return payulatam_values
