# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class PosDetails(models.TransientModel):
    _inherit = 'pos.details.wizard'

    include_products = fields.Boolean()
    pos_config_id = fields.Many2one('pos.config', required=True)

    def generate_co_pos_report(self):
        data = {
            'date_start': self.start_date,
            'date_stop': self.end_date,
            'config_ids': self.pos_config_id.ids,
            'include_products': self.include_products
        }
        return self.env.ref('l10n_co_pos_details.sale_details_report').report_action([], data=data)
