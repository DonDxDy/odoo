# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from werkzeug import urls

from odoo import api, models, _
from odoo.addons.payment_payumoney.controllers.main import PayuMoneyController
from odoo.exceptions import ValidationError


class PaymentTransaction(models.Model):
    _inherit = 'payment.transaction'

    @api.model
    def _get_tx_from_feedback_data(self, provider, data):
        """ Given a data dict coming from payumoney, verify it and find the related
        transaction record. """
        if provider != 'payumoney':
            return super()._get_tx_from_feedback_data(provider, data)

        reference = data.get('txnid')
        pay_id = data.get('mihpayid')
        shasign = data.get('hash')
        if not reference or not pay_id or not shasign:
            raise ValidationError(
                "PayUmoney: " + _('received data with missing reference (%(ref)s) or pay_id (%(id)s) or shasign (%(sha)s)',
                    ref=reference, id=pay_id, sha=shasign)
            )

        tx = self.search([('reference', '=', reference)])
        if not tx:
            raise ValidationError("PayUmoney: " + _('received data for reference %(ref)s; no order found', ref=reference))

        # Verify shasign
        shasign_check = tx.acquirer_id._payumoney_generate_sign('out', data)
        if shasign_check.upper() != shasign.upper():
            raise ValidationError("PayUmoney: " + _('invalid shasign, received %(sha)s, computed %(computed)s, for data %(data)s',
                sha=shasign, computed=shasign_check, data=data))

        return tx

    def _process_feedback_data(self, data):
        if self.provider != "payumoney":
            return super()._process_feedback_data(data)

        status = data.get('status')
        self.acquirer_reference = data.get('payuMoneyId')

        if status == 'success':
            self._set_done()
        elif status == 'pending':
            self._set_pending()
            self.state_message = data.get('error_Message') or data.get('field9') or ''
        else:
            self._set_canceled()
            self.state_message = data.get('field9') or ''

    def _get_specific_rendering_values(self, _processing_values):
        if self.provider != 'payumoney':
            return super()._get_specific_rendering_values(_processing_values)

        base_url = self.get_base_url()
        payumoney_values = dict(
            _processing_values,
            key=self.acquirer_id.payumoney_merchant_key,
            txnid=_processing_values['reference'],
            amount=_processing_values.get('amount'),
            productinfo=_processing_values['reference'],
            firstname=_processing_values.get('partner_name'),
            email=_processing_values.get('partner_email'),
            phone=_processing_values.get('partner_phone'),
            service_provider='payu_paisa',
            surl=urls.url_join(base_url, PayuMoneyController._success_url),
            furl=urls.url_join(base_url, PayuMoneyController._failure_url),
        )

        payumoney_values['hash'] = self.acquirer_id._payumoney_generate_sign('in', payumoney_values)
        payumoney_values['redirect_url'] = self.acquirer_id._payumoney_get_redirect_url()
        return payumoney_values
