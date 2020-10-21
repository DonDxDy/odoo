# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    def action_confirm(self):
        res = super(SaleOrder, self).action_confirm()
        for so in self:
            so.order_line._update_stand_slot()
        return res

    # TODO: Display the number of slots in the stat button
    def action_view_stand_list(self):
        action = self.env['ir.actions.act_window']._for_xml_id('website_event_stand.event_stand_slot_action')
        action['domain'] = [('sale_order_id', 'in', self.ids)]
        return action

    def _website_product_id_change(self, order_id, product_id, qty=0):
        order = self.env['sale.order'].sudo().browse(order_id)

        values = super(SaleOrder, self)._website_product_id_change(order_id, product_id, qty=qty)
        event_stand_slot_ids = None
        if self.env.context.get('event_stand_slot_ids'):
            event_stand_slot_ids = self.env.context.get('event_stand_slot_ids')

        if event_stand_slot_ids:
            slots = self.env['event.stand.slot'].browse(event_stand_slot_ids)
            # TODO: Should I test that all registrations belongs to the same event_stand_id ?

            values['event_id'] = slots.event_id.id
            values['event_stand_id'] = slots.event_stand_id.id
            values['event_stand_slot_ids'] = slots.ids
            values['name'] = slots._get_stand_multiline_description

        return values


class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    event_stand_id = fields.Many2one('event.stand', string='Event Stand')
    event_stand_slot_ids = fields.One2many('event.stand.slot', 'sale_order_line_id')
    is_event_stand = fields.Boolean(related='product_id.is_event_stand', readonly=True)

    @api.constrains('event_stand_slot_ids')
    def _check_if_contiguous_slots(self):
        for sol in self:
            if sol.event_stand_slot_ids:
                from_date = min(sol.event_stand_slot_ids.mapped('date_to'))
                to_date = max(sol.event_stand_slot_ids.mapped('date_from'))
                slot = self.env['event.stand.slot'].search([
                    ('event_stand_id', '=', sol.event_stand_id.id),
                    ('id', 'not in', sol.event_stand_slot_ids.ids),
                    ('date_from', '>=', from_date),
                    ('date_to', '<=', to_date)
                ])
                if slot.exists():
                    raise ValidationError(_('You must select contiguous Stand Slots.'))

    def create(self, vals_list):
        return super(SaleOrderLine, self).create(vals_list)

    def write(self, vals):
        return super(SaleOrderLine, self).write(vals)

    def unlink(self):
        self.event_stand_slot_ids.action_set_available()
        return super(SaleOrderLine, self).unlink()

    def _update_stand_slot(self):
        StandSlotSudo = self.env['event.stand.slot'].sudo()
        new_slots_vals = []
        for so_line in self.filtered('event_stand_id'):
            values = {
                'sale_order_line_id': so_line.id,
                'sale_order_id': so_line.order_id.id,
            }
            if so_line.event_stand_slot_id:
                so_line.event_stand_slot_id.write(values)
            else:
                values.update({'event_stand_id': so_line.event_stand_id.id})
                new_slots_vals.append(values)
        if new_slots_vals:
            StandSlotSudo.create(new_slots_vals)

    @api.onchange('product_id')
    def _onchange_product_id(self):
        if self.event_id and (not self.product_id or self.product_id.id not in self.event_id.mapped('event_stand_ids.product_id.id')):
            self.event_id = None

    @api.onchange('event_id')
    def _onchange_event_id(self):
        if self.event_stand_id and (not self.event_id or self.event_id != self.event_stand_id.event_id):
            self.event_stand_id = None
        if self.event_stand_slot_ids and (not self.event_id):
            self.event_stand_slot_ids = None

    @api.onchange('event_stand_id')
    def _onchange_event_stand_id(self):
        self.product_id_change()

    def get_sale_order_line_multiline_description_sale(self, product):
        if self.event_stand_id:
            # TODO: See how the translation works here (as it is done in event_sale)
            if self.event_stand_slot_ids:
                return self.event_stand_slot_ids._get_stand_multiline_description()
        else:
            return super(SaleOrderLine, self).get_sale_order_line_multiline_description_sale(product)

    def _get_display_price(self, product):
        if self.event_stand_id and self.event_id:
            company = self.event_id.company_id or self.env.company
            currency = company.currency_id
            extra_price = self.event_stand_id.extra_price * (len(self.event_stand_slot_ids) - 1)
            total_price = self.event_stand_id.price + extra_price
            return currency._convert(
                total_price, self.order_id.currency_id,
                self.order_id.company_id or self.env.company.id,
                self.order_id.date_order or fields.Date.today())
        else:
            return super(SaleOrderLine, self)._get_display_price(product)

    # TODO: When we change the event.stand.slot from a SOL we should change the state of it (reserverd -> available)

    # TODO: Look if this method is used when displaying on the portal cart
    # @api.depends('product_id.display_name')
    # def _compute_name_short(self):
    #     super(SaleOrderLine, self)._compute_name_short()
    #     for record in self:
    #         if record.event_stand_slot_ids:
    #             record.name_short = record.event_stand_slot_ids._get_stand_multiline_description()
