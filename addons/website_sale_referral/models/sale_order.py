# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models, fields, api
from ast import literal_eval


class SaleOrder(models.Model):
    _name = 'sale.order'
    _inherit = ['sale.order', 'referral.abstract']

    referred_email = fields.Char(related='partner_id.email')
    referred_name = fields.Char(related='partner_id.name')
    referred_company_name = fields.Char(compute='_compute_referred_company_name', store=False)

    @api.depends('partner_id', 'partner_id.company_id', 'partner_id.company_id.name')
    def _compute_referred_company_name(self):
        for order in self:
            order.referred_company_name = order.partner_id.company_id.name if order.partner_id.company_id else ''

    def is_fully_paid(self):
        self.ensure_one()
        if self.invoice_status != 'invoiced':
            return False
        else:
            amount_paid = 0
            for inv in self.invoice_ids:
                if inv.state == 'posted' and inv.payment_state == 'paid':
                    amount_paid += inv.currency_id._convert(inv.amount_total, self.currency_id, self.company_id, self.date_order)
            return 0 == self.currency_id.compare_amounts(self.amount_total, amount_paid)

    def _get_state_for_referral(self):
        self.ensure_one()
        if self.state == 'draft':
            return 'new'
        elif self.is_fully_paid():
            return 'done'
        elif self.state == 'cancel':
            return 'cancel'
        return 'in_progress'

    def write(self, vals):
        if not self.env.user.has_group('website_crm_referral.group_lead_referral') and \
           any([elem in vals for elem in ['state', 'invoice_status', 'amount_total']]):
            orders = list(filter(lambda o: o.campaign_id == self.env.ref('website_sale_referral.utm_campaign_referral') and not o.deserve_reward, self))
            old_states = {}
            for order in orders:
                old_states[order] = order._get_referral_statuses(self.source_id, self.partner_id.email)
            r = super().write(vals)
            for order in orders:
                new_state = order._get_referral_statuses(self.source_id, self.partner_id.email)
                order._check_referral_progress(old_states[order], new_state)
            return r
        else:
            return super().write(vals)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('campaign_id', None) == self.env.ref('website_sale_referral.utm_campaign_referral').id:
                if 'user_id' not in vals:
                    vals['user_id'] = self.env.company.salesperson_id.id
                if 'team_id' not in vals:
                    vals['team_id'] = self.env.company.salesteam_id.id
        return super(SaleOrder, self).create(vals)
