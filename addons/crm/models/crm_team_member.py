# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import datetime
import logging
import math
import threading
import random

from odoo import api, exceptions, fields, models, _
from odoo.addons.crm.models.crm_lead import LEAD_ASSIGN_EVAL_CONTEXT
from odoo.osv import expression
from odoo.tools import safe_eval

_logger = logging.getLogger(__name__)


class Team(models.Model):
    _inherit = 'crm.team.member'

    # assignment
    assignment_domain = fields.Char('Assignment Domain', tracking=True)
    assignment_max = fields.Integer('Max Leads (last 30 days)')
    lead_month_count = fields.Integer(
        'Leads (30 days)', compute='_compute_lead_month_count',
        help='Lead assigned to this member those last 30 days')

    @api.depends('user_id', 'crm_team_id')
    def _compute_lead_month_count(self):
        for member in self:
            if member.user_id.id and member.crm_team_id.id:
                limit_date = fields.Datetime.now() - datetime.timedelta(days=30)
                domain = [('user_id', '=', member.user_id.id),
                          ('team_id', '=', member.crm_team_id.id),
                          ('date_open', '>=', limit_date)]
                member.lead_month_count = self.env['crm.lead'].search_count(domain)
            else:
                member.lead_month_count = 0

    @api.constrains('assignment_domain')
    def _constrains_assignment_domain(self):
        for member in self:
            try:
                domain = safe_eval.safe_eval(member.assignment_domain or '[]', LEAD_ASSIGN_EVAL_CONTEXT)
                self.env['crm.lead'].search(domain, limit=1)
            except Exception:
                raise exceptions.UserError(_('Team membership assign domain is incorrectly formatted'))

    # ------------------------------------------------------------
    # LEAD ASSIGNMENT
    # ------------------------------------------------------------

    def _assign_and_convert_leads(self, work_days=2):
        """ Main processing method to assign leads to sales team members and
        convert leads. This method follows the following heuristic

          1 prepare a global lead count based on total leads to assign to
            sales persons;
          2 for each member, fetch leads according to their assignment domain
            that further restricts leads already belonging to the member's
            team. No domain means any lead belonging to the team is acceptable;
          3 assign leads to members using a weighted random order. Weight is
            based on remaining leads to assign, meaning members with more leads
            to assign will be statistically picked sooner. Once a lead is
            assigned it cannot be assigned again to another member.

        :param work_days: number of work days to consider when assigning leads.
          We consider that Member.assignment_max targets 30 days. We therefore
          have to make a ratio between expected number of work days and maximum
          assignment for those 30 days.
        """
        if not work_days or work_days > 30:
            raise ValueError(
                _('Leads assignments should be done for at least 1 or maximum 30 work days, not %s', work_days)
            )
        # assignment_max is valid for "30 days" -> divide by requested work_days
        # to have number of leads to assign
        assign_ratio = 30.0 / work_days

        members_data, population, weights = dict(), list(), list()
        members = self.filtered(lambda member: member.assignment_max > member.lead_month_count)
        if not members:
            return members_data

        lead_limit = sum(
            min(
                int(math.ceil(member.assignment_max / assign_ratio)),
                (member.assignment_max - member.lead_month_count)
            )
            for member in members
        )

        # could probably be optimized
        for member in members:
            lead_domain = expression.AND([
                safe_eval.safe_eval(member.assignment_domain or '[]', LEAD_ASSIGN_EVAL_CONTEXT),
                ['&', '&', ('user_id', '=', False), ('date_open', '=', False), ('team_id', '=', member.crm_team_id.id)]
            ])

            leads = self.env["crm.lead"].search(lead_domain, order='probability DESC', limit=lead_limit)

            to_assign = min(member.assignment_max - member.lead_month_count, round(member.assignment_max / assign_ratio))
            members_data[member.id] = {
                "team_member": member,
                "max": member.assignment_max,
                "to_assign": to_assign,
                "leads": leads,
                "assigned": self.env["crm.lead"],
            }
            population.append(member.id)
            weights.append(to_assign)

        leads_done_ids = set()
        counter = 0
        while population and counter < 100:
            counter += 1
            member_id = random.choices(population, weights=weights, k=1)[0]
            member_index = population.index(member_id)
            member_data = members_data[member_id]

            lead = next((lead for lead in member_data['leads'] if lead.id not in leads_done_ids), False)
            if lead:
                leads_done_ids.add(lead.id)
                members_data[member_id]["assigned"] += lead
                weights[member_index] = weights[member_index] - 1

                lead.with_context(mail_auto_subscribe_no_notify=True).convert_opportunity(
                    lead.partner_id.id,
                    user_ids=member_data['team_member'].user_id.ids
                )

                # auto-commit except in testing mode
                auto_commit = not getattr(threading.currentThread(), 'testing', False)
                if auto_commit:
                    self._cr.commit()
            else:
                weights[member_index] = 0

            if weights[member_index] <= 0:
                population.pop(member_index)
                weights.pop(member_index)

        _logger.info('Assigned %s leads to %s salesmen' % (len(leads_done_ids), len(self)))
        return members_data
