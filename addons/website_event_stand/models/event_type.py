# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class EventType(models.Model):
    _inherit = 'event.type'

    website_stand = fields.Boolean(
        string='Stands on Website', compute='_compute_website_menu_data',
        readonly=False, store=True)

    @api.depends('website_menu')
    def _compute_website_menu_data(self):
        for event_type in self:
            event_type.website_stand = event_type.website_menu
