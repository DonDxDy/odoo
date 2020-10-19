# coding: utf-8
# Part of Odoo. See LICENSE file for full copyright and licensing details.

# Copyright 2015 Eezee-It
import json
import logging

from werkzeug import urls

from odoo import models, api, _
from odoo.exceptions import ValidationError
from odoo.addons.payment.utils import singularize_reference_prefix, to_minor_currency_units, to_major_currency_units
from odoo.addons.payment_sips.controllers.main import SipsController

from .const import SIPS_SUPPORTED_CURRENCIES, SIPS_STATUS_CANCEL, SIPS_STATUS_PENDING, \
    SIPS_STATUS_ERROR, SIPS_STATUS_REFUSED, SIPS_STATUS_VALID, SIPS_STATUS_WAIT

_logger = logging.getLogger(__name__)


class PaymentTransaction(models.Model):
    _inherit = "payment.transaction"

    @api.model
    def _compute_reference(self, provider, prefix=None, separator="-", **kwargs):
        if provider == 'sips':
            separator = 'x'
            prefix = singularize_reference_prefix(separator='')
        return super()._compute_reference(provider, prefix, separator, **kwargs)

    def _get_specific_rendering_values(self, processing_values):
        self.ensure_one()
        if self.provider != "sips":
            return super()._get_specific_rendering_values(processing_values)

        base_url = self.get_base_url()
        currency = self.env["res.currency"].browse(processing_values["currency_id"])
        sips_currency = SIPS_SUPPORTED_CURRENCIES.get(currency.name)
        if not sips_currency:
            raise ValidationError(
                "SIPS: " + _("this currency is not supported: %s" % currency.name)
            )
        # rounded to its smallest unit, depends on the currency
        amount = to_minor_currency_units(processing_values['amount'], currency)

        sips_tx_values = dict(processing_values)
        data = {
            "amount": amount,
            "currencyCode": sips_currency,
            "merchantId": self.acquirer_id.sips_merchant_id,
            "normalReturnUrl": urls.url_join(base_url, SipsController._return_url),
            "automaticResponseUrl": urls.url_join(base_url, SipsController._notify_url),
            "transactionReference": processing_values["reference"],
            "statementReference": processing_values["reference"],
            "keyVersion": self.acquirer_id.sips_key_version,
            "returnContext": json.dumps(dict(reference=sips_tx_values["reference"])),
        }
        sips_tx_values.update(
            {
                "Data": "|".join([f"{k}={v}" for k, v in data.items()]),
                "InterfaceVersion": self.acquirer_id.sips_version,
            }
        )

        shasign = self.acquirer_id._sips_generate_shasign(sips_tx_values)
        sips_tx_values["Seal"] = shasign
        sips_tx_values["tx_url"] = self._sips_get_redirect_action_url()
        return sips_tx_values

    def _sips_get_redirect_action_url(self):
        self.ensure_one()
        return (
            self.acquirer_id.sips_prod_url
            if self.acquirer_id.state == "enabled"
            else self.acquirer_id.sips_test_url
        )

    def _sips_data_to_object(self, data):
        res = {}
        for element in data.split("|"):
            (key, value) = element.split("=")
            res[key] = value
        return res

    @api.model
    def _get_tx_from_feedback_data(self, provider, data):
        if provider != "sips":
            return super()._get_tx_from_feedback_data(provider, data)

        data = self._sips_data_to_object(data["Data"])
        reference = data.get("transactionReference")

        if not reference:
            return_context = json.loads(data.get("returnContext", "{}"))
            reference = return_context.get("reference")

        tx = self.search([("reference", "=", reference)])
        if not tx:
            raise ValidationError("SIPS: " + _("received data for reference %s; no order found", reference))

        sips_currency = SIPS_SUPPORTED_CURRENCIES.get(tx.currency_id.name)
        if not sips_currency:
            raise ValidationError("SIPS: " + _("this currency is not supported: %s" % tx.currency_id.name))

        amount_converted = to_major_currency_units(float(data.get("amount", "0.0")), tx.currency_id)
        if tx.currency_id.compare_amounts(amount_converted, tx.amount) != 0:
            raise ValidationError(_('Incorrect amount: received %(received).2f, expected %(expected).2f',
                received=amount_converted, expected=tx.amount))
        return tx

    def _process_feedback_data(self, data):
        if self.provider != "sips":
            return super()._process_feedback_data(data)
        data = self._sips_data_to_object(data.get("Data"))
        status = data.get("responseCode")

        self.acquirer_reference = data.get("transactionReference")
        if status in SIPS_STATUS_VALID:
            msg = f"ref: {self.reference}, got valid response [{status}], set as done."
            self._set_done()
        elif status in SIPS_STATUS_ERROR:
            msg = f"ref: {self.reference}, got response [{status}], set as cancel."
            self._set_canceled()
        elif status in SIPS_STATUS_WAIT:
            msg = f"ref: {self.reference}, got wait response [{status}], set as cancel."
            self._set_canceled()
        elif status in SIPS_STATUS_REFUSED:
            msg = f"ref: {self.reference}, got refused response [{status}], set as cancel."
            self._set_canceled()
        elif status in SIPS_STATUS_PENDING:
            msg = f"ref: {self.reference}, got pending response [{status}], set as pending."
            self._set_pending()
        elif status in SIPS_STATUS_CANCEL:
            msg = (
                f"ref: {self.reference}, got cancel response [{status}], set as cancel."
            )
            self._set_canceled()
        else:
            msg = f"ref: {self.reference}, got unrecognized response [{status}], set as error."
            self._set_error(_('Unrecognized response received from the payment provider.'))
        _logger.info(msg)
