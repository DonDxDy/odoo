# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class CrmTeamMember(models.Model):
    _name = 'crm.team.member'
    _inherit = ['mail.thread']
    _description = 'Sales Team Member'
    _rec_name = 'user_id'

    crm_team_id = fields.Many2one('crm.team', string='Sales Team', index=True, required=True)
    user_id = fields.Many2one(
        'res.users', string='Salesman',   # check responsible field
        index=True, ondelete='cascade', required=True,
        domain="['&', ('share', '=', False), ('id', 'not in', user_in_teams_ids)]")
    user_in_teams_ids = fields.Many2many(
        'res.users', compute='_compute_user_in_teams_ids',
        help='UX: Give users not to add in the currently chosen team to avoid duplicates')
    active = fields.Boolean(string='Active', default=True)
    is_membership_multi = fields.Boolean(
        'Multiple Memberships Allowed', compute='_compute_is_membership_multi',
        help='If True, users may belong to several sales teams. Otherwise membership is limited to a single sales team.')
    is_in_another_team = fields.Boolean(compute='_compute_is_in_another_team')
    # salesman information
    image_1920 = fields.Image("Image", related="user_id.image_1920", max_width=1920, max_height=1920)
    image_128 = fields.Image("Image (128)", related="user_id.image_128", max_width=128, max_height=128)
    name = fields.Char(string='Name', related='user_id.display_name', readonly=False)
    email = fields.Char(string='Email', related='user_id.email')
    phone = fields.Char(string='Phone', related='user_id.phone')
    mobile = fields.Char(string='Mobile', related='user_id.mobile')
    company_id = fields.Many2one('res.company', string='Company', related='user_id.company_id')

    _sql_constraints = [
        ('crm_team_member_unique',
         'UNIQUE(crm_team_id,user_id)',
         'Error, team / user memberships should not be duplicated.'),
    ]

    @api.depends('crm_team_id')
    @api.depends_context('default_crm_team_id')
    def _compute_user_in_teams_ids(self):
        if self.env['ir.config_parameter'].sudo().get_param('sales_team.membership_multi', False):
            member_user_ids = self.env['res.users']
        else:
            member_user_ids = self.env['crm.team.member'].search([]).user_id
        for member in self:
            if member_user_ids:
                member.user_in_teams_ids = member_user_ids
            elif member.crm_team_id:
                member.user_in_teams_ids = member.crm_team_id.member_ids
            elif self.env.context.get('default_crm_team_id'):
                member.user_in_teams_ids = self.env['crm.team'].browse(self.env.context['default_crm_team_id']).member_ids
            else:
                member.user_in_teams_ids = self.env['res.users']

    @api.depends('crm_team_id')
    def _compute_is_membership_multi(self):
        multi_enabled = self.env['ir.config_parameter'].sudo().get_param('sales_team.membership_multi', False)
        for member in self:
            member.is_membership_multi = multi_enabled

    @api.depends('user_id', 'crm_team_id')
    def _compute_is_in_another_team(self):
        existing = self.env['crm.team.member'].search([('user_id', 'in', self.user_id.ids)])
        user_mapping = dict.fromkeys(existing.user_id, self.env['crm.team'])
        for membership in existing:
            user_mapping[membership.user_id] |= membership.crm_team_id
        for member in self:
            if not user_mapping.get(member.user_id):
                member.is_in_another_team = False
                continue
            teams = user_mapping[member.user_id]
            remaining = teams - (member.crm_team_id | member._origin.crm_team_id)
            member.is_in_another_team = len(remaining) > 0

    @api.model_create_multi
    def create(self, values_list):
        """ Specific behavior implemented on create

          * mono membership mode: other user memberships are automatically
            archived (a warning already told it in form view);
          * creating a membership already existing as archived: old one is
            automatically removed;
        """
        is_membership_multi = self.env['ir.config_parameter'].sudo().get_param('sales_team.membership_multi', False)
        exist_all = self.with_context(active_test=False).search([
            ('user_id', 'in', [values['user_id'] for values in values_list])
        ])
        user_memberships = dict.fromkeys(exist_all.user_id.ids, self.env['crm.team.member'])
        for membership in exist_all:
            user_memberships[membership.user_id.id] += membership

        exist_to_remove = self.env['crm.team.member']
        exist_to_archive = self.env['crm.team.member']
        for values in values_list:
            exist_current = user_memberships.get(values['user_id'])
            if not exist_current:
                continue
            if not is_membership_multi:
                to_archive = exist_current.filtered(lambda m: m.active and m.crm_team_id.id != values['crm_team_id'])
                if to_archive:
                    exist_to_archive += to_archive
            to_remove = exist_current.filtered(lambda m: not m.active and m.crm_team_id.id == values['crm_team_id'])
            if to_remove:
                exist_to_remove += to_remove

        if exist_to_remove:
            exist_to_remove.unlink()
        if exist_to_archive:
            exist_to_archive.active = False

        return super(CrmTeamMember, self).create(values_list)

    def write(self, values):
        """ When updating memberships to a new team, erase all other archived
        memberships. """
        if values.get('crm_team_id'):
            existing_dups = self.with_context(active_test=False).search([
                ('id', 'not in', self.ids),
                ('user_id', 'in', self.user_id.ids),
                ('crm_team_id', '=', values['crm_team_id']),
                ('active', '=', False)
            ])
            if existing_dups:
                existing_dups.unlink()

        return super(CrmTeamMember, self).write(values)
