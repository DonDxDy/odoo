# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.addons.http_routing.models.ir_http import slug


class Event(models.Model):
    _inherit = 'event.event'

    exhibition_map = fields.Image(string='Exhibition Map', max_width=1024, max_height=1024)
    event_stand_ids = fields.One2many('event.stand', 'event_id', string='Stands')
    event_stand_count = fields.Integer(compute='_compute_event_stand_count')
    event_stand_type_ids = fields.Many2many('event.stand.type', compute='_compute_event_stand_type_ids', store=True)
    event_stand_slot_ids = fields.One2many('event.stand.slot', 'event_id', string='Slots')
    event_stand_slot_count = fields.Integer(compute='_compute_event_stand_slot_count')
    website_stand = fields.Boolean('Stands on Website', compute='_compute_website_stand', readonly=False, store=True)
    stand_menu_ids = fields.One2many('website.event.menu', 'event_id', string='Event Stand Menus', domain=[('menu_type', '=', 'stand')])

    @api.depends('event_stand_ids')
    def _compute_event_stand_count(self):
        for event in self:
            event.event_stand_count = len(event.event_stand_ids)

    @api.depends('event_stand_ids')
    def _compute_event_stand_type_ids(self):
        for event in self:
            event.event_stand_type_ids = event.event_stand_ids.mapped('stand_type_id')

    @api.depends('event_stand_slot_ids')
    def _compute_event_stand_slot_count(self):
        for event in self:
            event.event_stand_slot_count = len(event.event_stand_slot_ids)

    @api.depends('event_type_id', 'website_menu')
    def _compute_website_stand(self):
        for event in self:
            if event.event_type_id and event.event_type_id != event._origin.event_type_id:
                event.website_stand = event.event_type_id.website_stand
            elif event.website_menu and (event.website_menu != event._origin.website_menu or not event.website_stand):
                event.website_stand = True
            elif not event.website_menu:
                event.website_stand = False

    # ------------------------------------------------------------
    # WEBSITE MENU MANAGEMENT
    # ------------------------------------------------------------

    def toggle_website_stand(self, val):
        self.website_stand = val

    def _get_menu_update_fields(self):
        return super(Event, self)._get_menu_update_fields() + ['website_stand']

    def _update_website_menus(self, menus_update_by_field=None):
        super(Event, self)._update_website_menus(menus_update_by_field=menus_update_by_field)
        for event in self:
            if event.menu_id and (not menus_update_by_field or event in menus_update_by_field.get('website_stand')):
                event._update_website_menu_entry('website_stand', 'stand_menu_ids', '_get_stand_menu_entries')

    def _get_menu_type_field_matching(self):
        res = super(Event, self)._get_menu_type_field_matching()
        res['stand'] = 'website_stand'
        return res

    def _get_stand_menu_entries(self):
        self.ensure_one()
        return [
            (_('Become a sponsor'), '/event/%s/stands/register' % slug(self), False, 90, 'stand')
        ]
