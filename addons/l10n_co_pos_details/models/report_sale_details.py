# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import api, models


class PosOrder(models.AbstractModel):
    _inherit = 'report.point_of_sale.report_saledetails'
    _description = 'Point of Sale Details'

    @api.model
    def _prepare_sale_details(self, orders, domain, date_start, date_stop, config_ids, session_ids):
        result = super(PosOrder, self)._prepare_sale_details(orders, domain, date_start, date_stop, config_ids, session_ids)
        result['include_products'] = True
        if len(config_ids) == 1 and self.env.company.country_id.code == 'CO':
            result.update({
                'include_products': False,
                'pos_config': self.env['pos.config'].browse(config_ids),
                'first_ref': orders and orders[-1].name,
                'last_ref': orders and orders[0].name,
                'total_payment_count': sum(payment.get('count') for payment in result.get('payments')),
            })
        return result
