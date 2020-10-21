# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields


class EventStandConfigurator(models.TransientModel):
    _name = 'event.stand.configurator'
    _description = 'Event Stand Configurator'

    product_id = fields.Many2one('product.product', string='Product', readonly=True)
    sale_order_line_id = fields.Many2one('sale.order.line', string='Sale Order Line', readonly=True)
    event_id = fields.Many2one('event.event', string='Event', required=True)
    event_stand_id = fields.Many2one('event.stand', string='Event Stand', required=True)
    event_stand_slot_ids = fields.Many2many('event.stand.slot', string='Stand Slot', required=True)
