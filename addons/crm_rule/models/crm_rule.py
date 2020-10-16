# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from ast import literal_eval
from collections import defaultdict
import datetime
import logging

from odoo import api, fields, models, _
from odoo.addons.crm.models.crm_lead import LEAD_ASSIGN_EVAL_CONTEXT
from odoo.osv import expression
from odoo.tools import safe_eval

_logger = logging.getLogger(__name__)


class CrmRule(models.Model):
    """ Rule model for updating leads / performing maintenance on leads.

    UPDATE ME
    """
    _name = "crm.rule"
    _description = "CRM Rules"
    _inherit = ["mail.thread"]

    # Definition
    name = fields.Char('Rule Name', required=True, translate=True)
    active = fields.Boolean('Active', default=True)
    last_run = fields.Datetime('Last run')
    # Triggers
    rule_domain = fields.Char('Domain', tracking=True, required=True)
    event_based = fields.Boolean(
        'Event-based rule',
        help='When checked, the rule will be re-evaluated every time, even for leads '
             'that have already been checked previously. This option incurs a large '
             'performance penalty, so it should be checked only for rules that depend '
             'on dynamic events',
        default=False, tracking=True
    )
    # Action
    rule_type = fields.Selection([
        ('tag', 'Add a tag'),
        ('lost', 'Set Lost'),
        ('unlink', 'Delete')], string="Rule Type",
        default='tag', required=True, tracking=True,
        help='Scoring will add a score of `value` for this lead.\n'
             'Archive will set active = False on the lead (archived)\n'
             'Delete will delete definitively the lead\n\n'
             'Actions are done in sql and bypass the access rights and orm mechanism (create `score`, write `active`, unlink `crm_lead`)')
    crm_tag_id = fields.Many2one('crm.tag', domain=[('rule_tag', '=', True)])

    @api.constrains('rule_domain')
    def _constrains_rule_domain(self):
        for rule in self:
            try:
                domain = safe_eval.safe_eval(rule.rule_domain or '[]', LEAD_ASSIGN_EVAL_CONTEXT)
                self.env['crm.lead'].search(domain, limit=1)
            except Exception as e:
                _logger.warning('Exception: %s' % (e,))
                raise Warning('The domain is incorrectly formatted')

    @api.constrains('rule_type', 'crm_tag_id')
    def _constrains_rule_type_tag(self):
        for rule in self:
            if rule.rule_type == 'tag' and not rule.crm_tag_id:
                raise Warning('Missing tag')

    def _run_global(self):
        return self.search([])._run_on_leads()

    def _run_on_leads(self, lead_ids=None):
        """

        :param lead_ids: if None or False, runs on all leads. If anything else
          it is used to filter leads. A void list means no lead ids.
        """
        _logger.info('CRM RULE: start with rules (%s) on leads (count: %s)' % (
            self.ids if len(self) < 10 else len(self),
            len(lead_ids) if lead_ids not in (None, False) else 'all'
        ))

        # Sort rules
        sort_types = self._sort_types()
        sorted_rules = self.sorted(key=lambda rule: sort_types.get(rule['rule_type']))

        for rule in sorted_rules:
            rule._run_rule(lead_ids)
            # if not (lead_ids or ids):  # if global scoring
            #     score.last_run = now

        _logger.info('CRM RULE: end')

    def _run_rule(self, lead_ids):
        self.ensure_one()
        if self.rule_type == 'unlink':
            return self._run_rule_unlink(lead_ids)    
        if self.rule_type == 'lost':
            return self._run_rule_lost(lead_ids)
        if self.rule_type == 'tag':
            return self._run_rule_tag(lead_ids)
        return False

    def _run_rule_lost(self, lead_ids):
        self.ensure_one()
        lead_domain = self._get_rule_domain(lead_ids)
        self.env['crm.lead'].search(lead_domain).action_set_lost()

    def _run_rule_tag(self, lead_ids):
        self.ensure_one()
        expr = expression.expression(self._get_rule_domain(lead_ids), self.env['crm.lead'])
        from_clause, where_clause, where_params = expr.query.get_sql()

        where_clause += """ AND (id NOT IN (SELECT lead_id FROM crm_tag_rel WHERE tag_id = %s)) """
        where_params.append(self.crm_tag_id.id)

        self._cr.execute(
            """
                INSERT INTO crm_tag_rel
                SELECT crm_lead.id as lead_id, %s as score_id
                FROM %s
                WHERE %s RETURNING lead_id
            """ % (self.crm_tag_id.id, from_clause, where_clause), where_params
        )
        # Force recompute of fields that depends on score_ids
        returning_ids = [resp[0] for resp in self._cr.fetchall()]
        # leads = self.env["crm.lead"].browse(returning_ids)
        # leads.modified(['score_ids'])
        # leads.recompute()

    def _run_rule_unlink(self, lead_ids):
        self.ensure_one()
        expr = expression.expression(self._get_rule_domain(lead_ids), self.env['crm.lead'])
        from_clause, where_clause, where_params = expr.query.get_sql()

        self.env['crm.lead'].flush()
        self._cr.execute("""
            DELETE FROM %s
            WHERE %s
            RETURNING id""" % (from_clause, where_clause), where_params
        )
        # deleted_ids = [row[0] for row in self._cr.fetchall()]
        # deleted_leads = self.env['crm.lead'].browse(deleted_ids)

    def _sort_types(self):
        """ Give priority based on action type. Unlinking or marking as lost
        by default should be done before running an action."""
        return dict(unlink=1, lost=2, tag=3)

    def _get_rule_domain(self, lead_ids):
        """ 
        """
        self.ensure_one()
        domain = safe_eval.safe_eval(self.rule_domain or '[]', LEAD_ASSIGN_EVAL_CONTEXT)

        # exclude won / lost
        domain = expression.AND([
            domain,
            ['|', ('stage_id.is_won', '=', False), '&', '&', ('probability', '!=', False), ('probability', '!=', 0), ('probability', '!=', 100)]
        ])
        if lead_ids:
            domain = expression.AND([
                domain,
                [('id', 'in', lead_ids)]
            ])
        elif not self.event_based and self.last_run:
            domain = expression.AND([
                domain,
                [('create_date', '>', self.last_run)]
            ])
        return domain
