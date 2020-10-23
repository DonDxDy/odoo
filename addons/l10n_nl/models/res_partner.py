# coding: utf-8
from odoo import api, fields, models, _


class ResPartner(models.Model):
    _inherit = 'res.partner'

    l10n_nl_kvk = fields.Char(string='KVK-nummer')
    l10n_nl_oin = fields.Char(string='Organisatie Indentificatie Nummer')

    @api.depends('l10n_nl_kvk', 'l10n_nl_oin')
    def _compute_en_16931_endpoint(self):
        for partner in self.filtered(lambda p: p.country_code == 'NL'):
            partner.en_16931_endpoint = partner.l10n_nl_oin or partner.l10n_nl_kvk
            if not partner.l10n_nl_kvk and not partner.l10n_nl_oin:
                partner.en_16931_endpoint_scheme = None
            else:
                partner.en_16931_endpoint_scheme = '0190' if partner.l10n_nl_oin else '0106'

        super(ResPartner, self.filtered(lambda p: p.country_code != 'NL'))._compute_en_16931_endpoint()
