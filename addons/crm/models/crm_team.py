# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import datetime
import logging
import random
import threading

from ast import literal_eval

from odoo import api, exceptions, fields, models, _
from odoo.addons.crm.models.crm_lead import LEAD_ASSIGN_EVAL_CONTEXT
from odoo.osv import expression
from odoo.tools.safe_eval import safe_eval

_logger = logging.getLogger(__name__)


class Team(models.Model):
    _name = 'crm.team'
    _inherit = ['mail.alias.mixin', 'crm.team']
    _description = 'Sales Team'

    use_leads = fields.Boolean('Leads', help="Check this box to filter and qualify incoming requests as leads before converting them into opportunities and assigning them to a salesperson.")
    use_opportunities = fields.Boolean('Pipeline', default=True, help="Check this box to manage a presales process with opportunities.")
    alias_id = fields.Many2one(
        'mail.alias', string='Alias', ondelete="restrict", required=True,
        help="The email address associated with this channel. New emails received will automatically create new leads assigned to the channel.")
    # assignment
    assignment_max = fields.Integer(
        'Lead Capacity', compute='_compute_assignment_max',
        help='Monthly leads for all salesmen belonging to the team')
    assignment_domain = fields.Char('Assignment Domain', tracking=True)
    # statistics about leads / opportunities / both
    lead_unassigned_count = fields.Integer(
        string='# Unassigned Leads', compute='_compute_lead_unassigned_count')
    lead_all_assigned_month_count = fields.Integer(
        string='# Leads/Opps assigned this month', compute='_compute_lead_all_assigned_month_count',
        help="Number of leads and opportunities assigned this last month.")
    opportunities_count = fields.Integer(
        string='# Opportunities', compute='_compute_opportunities_data')
    opportunities_amount = fields.Monetary(
        string='Opportunities Revenues', compute='_compute_opportunities_data')
    opportunities_overdue_count = fields.Integer(
        string='# Overdue Opportunities', compute='_compute_opportunities_overdue_data')
    opportunities_overdue_amount = fields.Monetary(
        string='Overdue Opportunities Revenues', compute='_compute_opportunities_overdue_data',)
    # alias: improve fields coming from _inherits, use inherited to avoid replacing them
    alias_user_id = fields.Many2one(
        'res.users', related='alias_id.alias_user_id', inherited=True,
        domain=lambda self: [('groups_id', 'in', self.env.ref('sales_team.group_sale_salesman_all_leads').id)])

    @api.depends('crm_team_member_ids.assignment_max')
    def _compute_assignment_max(self):
        for rec in self:
            rec.assignment_max = sum(s.assignment_max for s in rec.crm_team_member_ids)

    def _compute_lead_unassigned_count(self):
        leads_data = self.env['crm.lead'].read_group([
            ('team_id', 'in', self.ids),
            ('type', '=', 'lead'),
            ('user_id', '=', False),
        ], ['team_id'], ['team_id'])
        counts = {datum['team_id'][0]: datum['team_id_count'] for datum in leads_data}
        for team in self:
            team.lead_unassigned_count = counts.get(team.id, 0)

    @api.depends('crm_team_member_ids.lead_month_count')
    def _compute_lead_all_assigned_month_count(self):
        for team in self:
            team.lead_all_assigned_month_count = sum(s.lead_month_count for s in team.crm_team_member_ids)

    def _compute_opportunities_data(self):
        opportunity_data = self.env['crm.lead'].read_group([
            ('team_id', 'in', self.ids),
            ('probability', '<', 100),
            ('type', '=', 'opportunity'),
        ], ['expected_revenue:sum', 'team_id'], ['team_id'])
        counts = {datum['team_id'][0]: datum['team_id_count'] for datum in opportunity_data}
        amounts = {datum['team_id'][0]: datum['expected_revenue'] for datum in opportunity_data}
        for team in self:
            team.opportunities_count = counts.get(team.id, 0)
            team.opportunities_amount = amounts.get(team.id, 0)

    def _compute_opportunities_overdue_data(self):
        opportunity_data = self.env['crm.lead'].read_group([
            ('team_id', 'in', self.ids),
            ('probability', '<', 100),
            ('type', '=', 'opportunity'),
            ('date_deadline', '<', fields.Date.to_string(fields.Datetime.now()))
        ], ['expected_revenue', 'team_id'], ['team_id'])
        counts = {datum['team_id'][0]: datum['team_id_count'] for datum in opportunity_data}
        amounts = {datum['team_id'][0]: (datum['expected_revenue']) for datum in opportunity_data}
        for team in self:
            team.opportunities_overdue_count = counts.get(team.id, 0)
            team.opportunities_overdue_amount = amounts.get(team.id, 0)

    @api.onchange('use_leads', 'use_opportunities')
    def _onchange_use_leads_opportunities(self):
        if not self.use_leads and not self.use_opportunities:
            self.alias_name = False

    @api.constrains('assignment_domain')
    def _constrains_assignment_domain(self):
        for team in self:
            try:
                domain = safe_eval(team.assignment_domain or '[]', LEAD_ASSIGN_EVAL_CONTEXT)
                self.env['crm.lead'].search_count(domain)
            except Exception:
                raise Warning('Domain for %s is incorrectly formatted' % team.name)

    # ------------------------------------------------------------
    # ORM
    # ------------------------------------------------------------

    def write(self, vals):
        result = super(Team, self).write(vals)
        if 'use_leads' in vals or 'use_opportunities' in vals:
            for team in self:
                alias_vals = team._alias_get_creation_values()
                team.write({
                    'alias_name': alias_vals.get('alias_name', team.alias_name),
                    'alias_defaults': alias_vals.get('alias_defaults'),
                })
        return result

    # ------------------------------------------------------------
    # MESSAGING
    # ------------------------------------------------------------

    def _alias_get_creation_values(self):
        values = super(Team, self)._alias_get_creation_values()
        values['alias_model_id'] = self.env['ir.model']._get('crm.lead').id
        if self.id:
            if not self.use_leads and not self.use_opportunities:
                values['alias_name'] = False
            values['alias_defaults'] = defaults = literal_eval(self.alias_defaults or "{}")
            has_group_use_lead = self.env.user.has_group('crm.group_use_lead')
            defaults['type'] = 'lead' if has_group_use_lead and self.use_leads else 'opportunity'
            defaults['team_id'] = self.id
        return values

    # ------------------------------------------------------------
    # LEAD ASSIGNMENT
    # ------------------------------------------------------------

    @api.model
    def cron_assign_leads(self):
        return self.env['crm.team'].search([])._action_assign_leads()

    def action_assign_leads(self):
        lead_done_ids = self._action_assign_leads()
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'type': 'warning',
                'message': _("Assigned %s leads", len(lead_done_ids)),
                'next': {'type': 'ir.actions.act_window_close'},
            }
        }
    def _action_assign_leads(self):
        if not self.env.user.has_group('sales_team.group_sale_manager') and not self.env.user.has_group('base.group_system'):
            raise exceptions.UserError(_('Lead/Opportunities automatic assignment is limited to managers or administrators'))
        team_members = self.mapped('crm_team_member_ids')

        _logger.info('### START Lead Assignment (%d teams, %d sales persons)' % (len(self), len(team_members)))
        teams_data = self._assign_leads()
        _logger.info('### Team repartition done. Starting salesmen assignment.')
        members_data = team_members._assign_and_convert_leads()
        for member_id, member_info in members_data.items():
            _logger.info('-> member %s: assigned %s' % (member_id, member_info["assigned"]))
        _logger.info('### END Lead Assignment')
        return teams_data, members_data

    def _assign_leads(self):
        """ Assign leads to teams given by self.

        Heuristic of this method is for each team in self
          * find unassigned leads (no team, no user; not in a won stage, and not
            having False/0 (lost) or 100 (won) as probability) created at least
            BUNDLE_HOURS_DELAY hours ago;
          * keep only leads matching the team's assignment domain (empty means
            everything);

        This assignment also performs leads merge in order to clean database
        and avoid assigning duplicate leads to same or different teams.
        """
        BUNDLE_SIZE = int(self.env['ir.config_parameter'].sudo().get_param('crm.assignment.bundle', default=50))
        BUNDLE_HOURS_DELAY = int(self.env['ir.config_parameter'].sudo().get_param('crm.assignment.delay', default=1))
        max_create_dt = fields.Datetime.now() - datetime.timedelta(hours=BUNDLE_HOURS_DELAY)

        team_done = self.env['crm.team']
        remaining_teams = self.env['crm.team'].browse(random.sample(self.ids, k=len(self.ids)))

        # compute assign domain for each team before looping on them by bundle size
        teams_domain = dict.fromkeys(remaining_teams, False)
        for team in remaining_teams:
            teams_domain[team] = safe_eval(team.assignment_domain or '[]', LEAD_ASSIGN_EVAL_CONTEXT)

        teams_data = dict.fromkeys(remaining_teams, dict(assign=set(), merged=set(), duplicates=set()))
        while remaining_teams:
            for team in remaining_teams:
                lead_domain = expression.AND([
                    teams_domain[team],
                    [('create_date', '<', max_create_dt)],
                    ['&', ('team_id', '=', False), ('user_id', '=', False)],
                    ['|', ('stage_id.is_won', '=', False), ('probability', 'not in', [False, 0, 100])]
                ])
                leads = self.env["crm.lead"].search(lead_domain, limit=BUNDLE_SIZE)

                if len(leads) < BUNDLE_SIZE:
                    team_done += team

                # assign + deduplicate and log result to keep some history
                assign_res = team._assign_leads_deduplicate(leads)
                _logger.info('Assigned %s leads to team %s' % (len(leads), team.id))
                _logger.info('\tLeads: direct assign %s / merge assign %s (Duplicates: %s)' % (
                    assign_res['assign'], assign_res['merged'], assign_res['duplicates']
                ))
                for key in ('assign', 'merged', 'duplicates'):
                    teams_data[team][key].update(assign_res[key])

                # auto-commit except in testing mode
                auto_commit = not getattr(threading.currentThread(), 'testing', False)
                if auto_commit:
                    self._cr.commit()

            remaining_team_ids = [tid for tid in remaining_teams.ids if tid not in team_done.ids]
            remaining_teams = self.env['crm.team'].browse(random.sample(remaining_team_ids, k=len(remaining_team_ids)))

        return teams_data

    def _assign_leads_deduplicate(self, leads):
        """ Assign leads to sales team given by self. De-duplication is performed
        allowing to reduce number of resulting leads before assigning them
        to salesmen.

        :param leads: recordset of leads to assign to current team;
        """
        self.ensure_one()

        # classify leads
        leads_assign = self.env['crm.lead']  # direct team assign
        leads_done_ids, leads_merged_ids, leads_dup_ids = set(), set(), set()  # classification
        leads_dups_dict = dict()  # lead -> its duplicate
        for lead in leads:
            if lead.id not in leads_done_ids:
                lead_duplicates = lead._get_lead_duplicates(email=lead.email_from)
                if len(lead_duplicates) > 1:
                    leads_dups_dict[lead] = lead_duplicates
                    leads_done_ids.update((lead + lead_duplicates).ids)
                else:
                    leads_assign += lead
                    leads_done_ids.add(lead.id)

        leads_assign.handle_salesmen_assignment(user_ids=None, team_id=self.id)

        for lead in leads.filtered(lambda lead: lead in leads_dups_dict):
            lead_duplicates = leads_dups_dict[lead]
            merged = lead_duplicates._merge_opportunity(user_id=False, team_id=self.id)
            leads_dup_ids.update((lead_duplicates - merged).ids)
            leads_merged_ids.add(merged.id)

            # auto-commit except in testing mode
            auto_commit = not getattr(threading.currentThread(), 'testing', False)
            if auto_commit:
                self._cr.commit()

        return {
            'assign': set(leads_assign.ids),
            'merged': leads_merged_ids,
            'duplicates': leads_dup_ids,
        }

    # ------------------------------------------------------------
    # ACTIONS
    # ------------------------------------------------------------

    #TODO JEM : refactor this stuff with xml action, proper customization,
    @api.model
    def action_your_pipeline(self):
        action = self.env["ir.actions.actions"]._for_xml_id("crm.crm_lead_action_pipeline")
        user_team_id = self.env.user.sale_team_id.id
        if user_team_id:
            # To ensure that the team is readable in multi company
            user_team_id = self.search([('id', '=', user_team_id)], limit=1).id
        else:
            user_team_id = self.search([], limit=1).id
            action['help'] = _("""<p class='o_view_nocontent_smiling_face'>Add new opportunities</p><p>
    Looks like you are not a member of a Sales Team. You should add yourself
    as a member of one of the Sales Team.
</p>""")
            if user_team_id:
                action['help'] += "<p>As you don't belong to any Sales Team, Odoo opens the first one by default.</p>"

        action_context = safe_eval(action['context'], {'uid': self.env.uid})
        if user_team_id:
            action_context['default_team_id'] = user_team_id

        action['context'] = action_context
        return action

    def _compute_dashboard_button_name(self):
        super(Team, self)._compute_dashboard_button_name()
        team_with_pipelines = self.filtered(lambda el: el.use_opportunities)
        team_with_pipelines.update({'dashboard_button_name': _("Pipeline")})

    def action_primary_channel_button(self):
        if self.use_opportunities:
            return self.env["ir.actions.actions"]._for_xml_id("crm.crm_case_form_view_salesteams_opportunity")
        return super(Team,self).action_primary_channel_button()

    def _graph_get_model(self):
        if self.use_opportunities:
            return 'crm.lead'
        return super(Team,self)._graph_get_model()

    def _graph_date_column(self):
        if self.use_opportunities:
            return 'create_date'
        return super(Team,self)._graph_date_column()

    def _graph_y_query(self):
        if self.use_opportunities:
            return 'count(*)'
        return super(Team,self)._graph_y_query()

    def _extra_sql_conditions(self):
        if self.use_opportunities:
            return "AND type LIKE 'opportunity'"
        return super(Team,self)._extra_sql_conditions()

    def _graph_title_and_key(self):
        if self.use_opportunities:
            return ['', _('New Opportunities')] # no more title
        return super(Team, self)._graph_title_and_key()
