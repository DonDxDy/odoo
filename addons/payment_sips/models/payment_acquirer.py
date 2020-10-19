# coding: utf-8
# Part of Odoo. See LICENSE file for full copyright and licensing details.

# Copyright 2015 Eezee-It
from hashlib import sha256

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

from .const import SIPS_SUPPORTED_CURRENCIES

class PaymentAcquirer(models.Model):
    _inherit = "payment.acquirer"

    provider = fields.Selection(selection_add=[("sips", "Sips")],
        ondelete={"sips": "set default"})
    sips_merchant_id = fields.Char("Merchant ID", required_if_provider="sips",
        groups="base.group_system")
    sips_secret = fields.Char("Secret Key", size=64, required_if_provider="sips",
        groups="base.group_system")
    sips_test_url = fields.Char("Test url", required_if_provider="sips",
        default="https://payment-webinit.simu.sips-atos.com/paymentInit",
        groups="base.group_system")
    sips_prod_url = fields.Char("Production url", required_if_provider="sips",
        default="https://payment-webinit.sips-atos.com/paymentInit",
        groups="base.group_system")
    sips_version = fields.Char("Interface Version", required_if_provider="sips",
        default="HP_2.31", groups="base.group_system")
    sips_key_version = fields.Integer("Secret Key Version", required_if_provider="sips",
        default=2, groups="base.group_system")

    def _sips_generate_shasign(self, values):
        """ Generate the shasign for incoming or outgoing communications.

        :param dict values: transaction values
        :return: shasign
        :rtype: str
        """
        self.ensure_one()
        if self.provider != "sips":
            raise ValidationError(_("Incorrect payment acquirer provider"))
        data = values["Data"]
        key = self.sips_secret

        shasign = sha256((data + key).encode("utf-8"))
        return shasign.hexdigest()

    @api.model
    def _get_compatible_acquirers(self, *args, currency_id=None, **kwargs):
        acquirers = super()._get_compatible_acquirers(*args, currency_id, **kwargs)

        if currency_id and 'sips' in acquirers.mapped('name'):
            if self.env['res.currency'].browse(currency_id).name not in SIPS_SUPPORTED_CURRENCIES:
                acquirers = acquirers.filtered(lambda a: a.provider != 'sips')

        return acquirers
