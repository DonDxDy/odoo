# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import http, _
from odoo.http import request
from odoo.addons.website_event.controllers.main import WebsiteEventController


class WebsiteEventStandController(WebsiteEventController):

    # TODO: What is the purpose of the domain in the route ? Thought it would lead to a 404 if website_stand was false
    @http.route(['''/event/<model("event.event", "[('website_stand', '=', True)]"):event>/stands/register'''],
                type='http', auth='public', website=True, sitemap=False)
    def event_stand_register(self, event, **kwargs):
        values = {
            'event': event,
            'main_object': event,
        }
        return request.render('website_event_stand.event_stand_registration', values)

    @http.route(['/event/<model("event.event"):event>/stands/confirm'],
                type='http', auth='public', methods=['POST'], website=True)
    def event_stand_confirm(self, event, **kwargs):
        type_id = int(kwargs.get('stand_type_id'))
        stand_type_id = request.env['event.stand.type'].sudo().browse(type_id)
        slot_ids = [int(x) for x in request.httprequest.form.getlist('event_stand_slot_ids')]
        slots = request.env['event.stand.slot'].sudo().browse(slot_ids)
        order = request.website.sale_get_order(force_create=1)
        cart_value = order.with_context(event_stand_slot_ids=slots.ids)._cart_update(product_id=stand_type_id.product_id.id, add_qty=1)
        return request.redirect('/shop/checkout')
