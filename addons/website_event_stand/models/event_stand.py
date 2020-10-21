# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class EventStandType(models.Model):
    _name = 'event.stand.type'
    _description = 'Event Stand Type'

    name = fields.Char('Name', required=True)
    # TODO: If no image is set use the product's image
    image = fields.Image(string='Image', max_width=1024, max_height=1024)
    sequence = fields.Integer(default=10)
    event_id = fields.Many2one('event.event', string='Event')
    product_id = fields.Many2one('product.product', string='Product', required=True,
                                 domain=[('is_event_stand', '=', True)])
    price = fields.Float(string='Price', compute='_compute_price', readonly=False, store=True)
    can_be_shared = fields.Boolean('Can be Shared', help='This option enables the creation of multiple slots'
                                                         'that will be available for the stand')

    extra_price = fields.Float(string='Extra Slot Price', digits='Product Price')
    description = fields.Html(compute='_compute_description', readonly=False, store=True)

    @api.depends('product_id')
    def _compute_price(self):
        for stand in self:
            if stand.product_id and stand.product_id.lst_price:
                stand.price = stand.product_id.lst_price

    # TODO: product.product description is a text field. even if we convert it it will be ugly
    @api.depends('product_id')
    def _compute_description(self):
        for stand in self:
            if stand.product_id and stand.product_id.description_sale:
                stand.description = stand.product_id.description_sale


class EventStand(models.Model):
    _name = 'event.stand'
    _description = 'Event Stand'

    name = fields.Char('Name', required=True)
    event_id = fields.Many2one('event.event', string='Event')
    stand_type_id = fields.Many2one(
        'event.stand.type', string='Stand Type',
        domain="['|', ('event_id', '=', False), ('event_id', '=', event_id)]")
    product_id = fields.Many2one(related='stand_type_id.product_id')
    price = fields.Float(related='stand_type_id.price')
    extra_price = fields.Float(related='stand_type_id.extra_price')
    state = fields.Selection([
        ('available', 'Available'),
        ('sold', 'Sold'),
        ('unavailable', 'Unavailable')
     ], compute='_compute_state', store=True)
    stand_slot_ids = fields.One2many('event.stand.slot', 'event_stand_id', string='Slots')
    stand_slot_count = fields.Integer(string='Slots', store=True, readonly=True,
                                      compute='_compute_stand_slot')
    stand_slot_available = fields.Integer(string='Available Slots', store=True, readonly=True,
                                          compute='_compute_stand_slot')
    stand_slot_reserved = fields.Integer(string='Reserved Slots', store=True, readonly=True,
                                         compute='_compute_stand_slot')
    stand_slot_sold = fields.Integer(string='Rented Slots', store=True, readonly=True,
                                     compute='_compute_stand_slot')

    @api.depends('stand_slot_ids.state')
    def _compute_state(self):
        for stand in self:
            if not stand.stand_slot_ids or any(slot.state == 'available' for slot in stand.stand_slot_ids):
                stand.state = 'available'
            else:
                stand.state = 'unavailable'

    @api.depends('stand_slot_ids', 'stand_slot_ids.state')
    def _compute_stand_slot(self):
        for stand in self:
            stand.stand_slot_count = len(stand.stand_slot_ids)
            stand.stand_slot_available = len(stand.stand_slot_ids.filtered(lambda reg: reg.state == 'available'))
            stand.stand_slot_reserved = len(stand.stand_slot_ids.filtered(lambda reg: reg.state == 'reserved'))
            stand.stand_slot_sold = len(stand.stand_slot_ids.filtered(lambda reg: reg.state == 'sold'))
