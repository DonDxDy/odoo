# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models
from odoo.tools.float_utils import float_repr


class ReplenishmentReport(models.AbstractModel):
    _inherit = 'report.stock.report_product_product_replenishment'

    def _compute_draft_quantity_count(self, product_template_ids, product_variant_ids, wh_location_ids):
        """ Overrides to computes the valuations of the stock. """
        res = super()._compute_draft_quantity_count(product_template_ids, product_variant_ids, wh_location_ids)
        warehouse_id = self.env.context.get('warehouse', False)
        if warehouse_id:
            warehouse = self.env['stock.warehouse'].browse(warehouse_id)
        company = warehouse.company_id if warehouse else self.env.company
        currency = company.currency_id
        domain = []
        if product_template_ids:
            domain = [('product_tmpl_id', 'in', product_template_ids)]
        elif product_variant_ids:
            domain = [('id', 'in', product_variant_ids)]
        svl_values = self.env['product.product'].with_company(company).search_read(
            domain,
            ['value_svl']
        )
        value = sum([svl['value_svl'] for svl in svl_values])
        value = float_repr(value, precision_digits=currency.decimal_places)
        if currency.position == 'after':
            value = '%s %s' % (value, currency.symbol)
        else:
            value = '%s %s' % (currency.symbol, value)
        res['value'] = value
        return res
