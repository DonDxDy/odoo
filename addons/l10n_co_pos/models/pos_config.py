# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import pytz

from datetime import timedelta

from odoo import api, fields, models, _
from odoo.osv.expression import AND


class PosConfig(models.Model):
    _inherit = 'pos.config'

    pos_serial_number = fields.Char(string="POS Serial Number")


class PosOrder(models.AbstractModel):
    _name = 'report.l10n_co_pos.report_saledetails'
    _description = 'Point of Sale Details'

    @api.model
    def get_sale_details(self, date_start=False, date_stop=False, config_ids=False):
        """ Serialise the orders of the requested time period, configs and sessions.

        :param date_start: The dateTime to start, default today 00:00:00.
        :type date_start: str.
        :param date_stop: The dateTime to stop, default date_start + 23:59:59.
        :type date_stop: str.
        :param config_ids: Pos Config id's to include.
        :type config_ids: list of numbers.
        :param session_ids: Pos Config id's to include.
        :type session_ids: list of numbers.

        :returns: dict -- Serialised sales.
        """
        domain = [('state', 'in', ['paid', 'invoiced', 'done'])]

        if date_start:
            date_start = fields.Datetime.from_string(date_start)
        else:
            # start by default today 00:00:00
            user_tz = pytz.timezone(self.env.context.get('tz') or self.env.user.tz or 'UTC')
            today = user_tz.localize(fields.Datetime.from_string(fields.Date.context_today(self)))
            date_start = today.astimezone(pytz.timezone('UTC'))

        if date_stop:
            date_stop = fields.Datetime.from_string(date_stop)
            # avoid a date_stop smaller than date_start
            if (date_stop < date_start):
                date_stop = date_start + timedelta(days=1, seconds=-1)
        else:
            # stop by default today 23:59:59
            date_stop = date_start + timedelta(days=1, seconds=-1)

        domain = AND([domain,
                     [('date_order', '>=', fields.Datetime.to_string(date_start)),
                      ('date_order', '<=', fields.Datetime.to_string(date_stop))]
                      ])

        user_currency = self.env.company.currency_id
        report_data = []
        for config_id in config_ids:
            new_domain = AND([domain.copy(), [('config_id', '=', config_id.id)]])
            orders = self.env['pos.order'].search(new_domain)
            total = 0.0
            products_sold = {}
            taxes = {}
            for order in orders:
                if user_currency != order.pricelist_id.currency_id:
                    total += order.pricelist_id.currency_id._convert(
                        order.amount_total, user_currency, order.company_id, order.date_order or fields.Date.today())
                else:
                    total += order.amount_total
                currency = order.session_id.currency_id

                for line in order.lines:
                    key = (line.product_id, line.price_unit, line.discount)
                    products_sold.setdefault(key, 0.0)
                    products_sold[key] += line.qty

                    if line.tax_ids_after_fiscal_position:
                        line_taxes = line.tax_ids_after_fiscal_position.compute_all(line.price_unit * (1-(line.discount or 0.0)/100.0), currency, line.qty, product=line.product_id, partner=line.order_id.partner_id or False)
                        for tax in line_taxes['taxes']:
                            taxes.setdefault(tax['id'], {'name': tax['name'], 'tax_amount':0.0, 'base_amount':0.0})
                            taxes[tax['id']]['tax_amount'] += tax['amount']
                            taxes[tax['id']]['base_amount'] += tax['base']
                    else:
                        taxes.setdefault(0, {'name': _('No Taxes'), 'tax_amount':0.0, 'base_amount':0.0})
                        taxes[0]['base_amount'] += line.price_subtotal_incl

            payment_ids = self.env["pos.payment"].search([('pos_order_id', 'in', orders.ids)]).ids
            if payment_ids:
                self.env.cr.execute("""
                    SELECT method.name, sum(amount) total, count(payment.id)
                    FROM pos_payment AS payment,
                         pos_payment_method AS method
                    WHERE payment.payment_method_id = method.id
                        AND payment.id IN %s
                    GROUP BY method.name
                """, (tuple(payment_ids),))
                payments = self.env.cr.dictfetchall()
            else:
                payments = []
            data = {
                'pos_config': config_id,
                'currency_precision': user_currency.decimal_places,
                'first_ref': orders[0].name,
                'last_ref': orders[-1].name,
                'total_paid': user_currency.round(total),
                'payments': payments,
                'total_payment_count': sum(payment.get('count') for payment in payments),
                'company_name': self.env.company.name,
                'taxes': list(taxes.values()),
                'products': sorted([{
                    'product_id': product.id,
                    'product_name': product.name,
                    'code': product.default_code,
                    'quantity': qty,
                    'price_unit': price_unit,
                    'discount': discount,
                    'uom': product.uom_id.name
                } for (product, price_unit, discount), qty in products_sold.items()], key=lambda l: l['product_name'])
            }
            report_data.append(data)
        return report_data

    def _get_report_values(self, docids, data=None):
        data = dict(data or {})
        configs = self.env['pos.config'].browse(data['config_ids'])
        data.update({'sale_details': self.get_sale_details(data['date_start'], data['date_stop'], configs)})
        return data
