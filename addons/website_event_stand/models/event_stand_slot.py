# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from dateutil.relativedelta import relativedelta

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class EventStandSlot(models.Model):
    _name = 'event.stand.slot'
    _description = 'Event Stand Slot'
    _order = 'date_from'

    event_stand_id = fields.Many2one('event.stand', string='Stand', readonly=True, required=True)
    event_id = fields.Many2one(related='event_stand_id.event_id')
    topic = fields.Char('Topic')
    partner_id = fields.Many2one(related='sale_order_id.partner_id', string='Rent By')
    sale_order_id = fields.Many2one(related='sale_order_line_id.order_id', string='Source Sales Order')
    sale_order_line_id = fields.Many2one('sale.order.line', string='Source Sales Order Line', ondelete='set null')
    # date_from = fields.Datetime(compute='_compute_first_available_registration', readonly=False, store=True, required=True)
    # date_to = fields.Datetime(compute='_compute_first_available_registration', readonly=False, store=True, required=True)
    date_from = fields.Datetime(required=True)
    date_to = fields.Datetime(required=True)
    state = fields.Selection([
        ('available', 'Available'),
        ('reserved', 'Reserved'),
        ('sold', 'Sold'),
        ('unavailable', 'Unavailable'),
    ], default='available')

    @api.constrains('date_from', 'date_to')
    def _check_dates(self):
        for slot in self:
            date_from = slot.date_from
            date_to = slot.date_to
            if date_from > date_to:
                raise ValidationError(_('Slot start date must be earlier than the end date.'))
            event_date_from = slot.event_id.date_begin
            event_date_to = slot.event_id.date_end
            # TODO: format date to the current user timezone
            if date_from < event_date_from or date_from > event_date_to:
                raise ValidationError(_(
                    'Slot start date must be included between %(start)s and %(end)s',
                    start=event_date_from,
                    end=event_date_to
                ))
            if date_to < event_date_from or date_to > event_date_to:
                raise ValidationError(_(
                    'Slot end date must be included between %(start)s and %(end)s',
                    start=event_date_from,
                    end=event_date_to
                ))
            domain = [
                ('id', '!=', slot.id),
                ('event_stand_id', '=', slot.event_stand_id.id),
                '|', '|',
                '&', ('date_from', '<', slot.date_from), ('date_to', '>', slot.date_from),
                '&', ('date_from', '<', slot.date_to), ('date_to', '>', slot.date_to),
                '&', ('date_from', '<', slot.date_from), ('date_to', '>', slot.date_to)
            ]
            if self.search_count(domain) > 0:
                raise ValidationError(_('You can not have overlapping slots.'))

    def create(self, vals):
        return super(EventStandSlot, self).create(vals)

    def write(self, vals):
        if vals.get('sale_order_line_id'):
            vals['state'] = 'reserved'
        return super(EventStandSlot, self).write(vals)

    def name_get(self):
        return [(slot.id, '%s \U0001F852 %s' % (slot.date_from, slot.date_to if slot.date_from.date() != slot.date_to.date() else slot.date_to.time())) for slot in self]

    # TODO: This is considering the registrations are contiguous (and they should be !)
    def _get_stand_multiline_description(self):
        from_date = min(self.mapped('date_from'))
        to_date = max(self.mapped('date_to'))
        duration_display = '%s \U0001F852 %s' % (from_date, to_date if from_date.date() != to_date.date() else to_date.time())
        return '%s - %s\n%s' % (self.event_stand_id.name, duration_display, self.event_id.display_name)

    def action_set_reserved(self):
        self.write({'state': 'reserved'})

    def action_set_available(self):
        self.write({'state': 'available'})

    def action_view_sale_order(self):
        action = self.env["ir.actions.actions"]._for_xml_id("sale.action_orders")
        action['views'] = [(False, 'form')]
        action['res_id'] = self.sale_order_id.id
        return action

    # @api.depends('event_stand_id')
    # def _compute_first_available_registration(self):
    #     for registration in self:
    #         last_registration = self.search([
    #             ('event_id', '=', registration.event_id.id)
    #         ], order='date_to desc', limit=1)
    #         registration.date_from = last_registration.date_to
    #         registration.date_to = last_registration.date_to + relativedelta(hours=1)
