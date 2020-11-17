# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from datetime import timedelta, time
from odoo import api, fields, models
from odoo.tools.float_utils import float_round


class ProductProduct(models.Model):
    _inherit = 'product.product'

    sales_count = fields.Float(compute='_compute_sales_count', string='Sold')

    def _compute_sales_count(self):
        r = {}
        self.sales_count = 0
        if not self.user_has_groups('sales_team.group_sale_salesman'):
            return r
        date_from = fields.Datetime.to_string(fields.datetime.combine(fields.datetime.now() - timedelta(days=365),
                                                                      time.min))

        done_states = self.env['sale.report']._get_done_states()

        domain = [
            ('state', 'in', done_states),
            ('product_id', 'in', self.ids),
            ('date', '>=', date_from),
        ]
        for group in self.env['sale.report'].read_group(domain, ['product_id', 'product_uom_qty'], ['product_id']):
            r[group['product_id'][0]] = group['product_uom_qty']
        for product in self:
            if not product.id:
                product.sales_count = 0.0
                continue
            product.sales_count = float_round(r.get(product.id, 0), precision_rounding=product.uom_id.rounding)
        return r

    def action_view_sales(self):
        action = self.env["ir.actions.actions"]._for_xml_id("sale.report_all_channels_sales_action")
        action['domain'] = [('product_id', 'in', self.ids)]
        action['context'] = {
            'pivot_measures': ['product_uom_qty'],
            'active_id': self._context.get('active_id'),
            'search_default_Sales': 1,
            'active_model': 'sale.report',
            'time_ranges': {'field': 'date', 'range': 'last_365_days'},
        }
        return action

    def _get_invoice_policy(self):
        return self.invoice_policy

    def _get_combination_info_variant(self, add_qty=1, pricelist=False, parent_combination=False):
        """Return the variant info based on its combination.
        See `_get_combination_info` for more information.
        """
        self.ensure_one()
        return self.product_tmpl_id._get_combination_info(self.product_template_attribute_value_ids, self.id, add_qty, pricelist, parent_combination)

    @api.model
    def _name_search(self, name, args=None, operator='ilike', limit=100, name_get_uid=None):
        if name and self._context.get('sale_favorites'):
            partner_id = self._context.get('partner_id')
            if partner_id:
                product_ids = super(ProductProduct, self)._name_search(name, args, operator, None, name_get_uid)
                company_id = self._context.get('company_id')
                date_from = fields.Datetime.to_string(fields.datetime.combine(fields.datetime.now() - timedelta(days=365), time.min))
                done_states = self.env['sale.report']._get_done_states()
                weighted_res = []
                for product_id in product_ids:
                    domain = [
                        ('product_id', '=', product_id),
                        ('partner_id', '=', partner_id),
                        ('date', '>=', date_from),
                        ('state', 'in', done_states),
                        ('company_id', '=', company_id),
                    ]
                    result = self.env['sale.report'].read_group(domain, ['product_uom_qty'], 'product_id')
                    uom_qty = result[0]['product_uom_qty'] if result else 0
                    weighted_res.append([uom_qty, product_id])
                weighted_res.sort(key=lambda res: res[0], reverse=True)
                result = [res[1] for res in weighted_res]
                if limit:
                    result = result[:limit]
                return result
        return super(ProductProduct, self)._name_search(name, args, operator, limit, name_get_uid)


class ProductAttributeCustomValue(models.Model):
    _inherit = "product.attribute.custom.value"

    sale_order_line_id = fields.Many2one('sale.order.line', string="Sales Order Line", required=True, ondelete='cascade')

    _sql_constraints = [
        ('sol_custom_value_unique', 'unique(custom_product_template_attribute_value_id, sale_order_line_id)', "Only one Custom Value is allowed per Attribute Value per Sales Order Line.")
    ]
