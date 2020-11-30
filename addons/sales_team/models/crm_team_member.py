# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, exceptions, fields, models, _


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
    member_warning = fields.Text(compute='_compute_member_warning')
    # salesman information
    image_1920 = fields.Image("Image", related="user_id.image_1920", max_width=1920, max_height=1920)
    image_128 = fields.Image("Image (128)", related="user_id.image_128", max_width=128, max_height=128)
    name = fields.Char(string='Name', related='user_id.display_name', readonly=False)
    email = fields.Char(string='Email', related='user_id.email')
    phone = fields.Char(string='Phone', related='user_id.phone')
    mobile = fields.Char(string='Mobile', related='user_id.mobile')
    company_id = fields.Many2one('res.company', string='Company', related='user_id.company_id')

    @api.constrains('crm_team_id', 'user_id')
    def _constrains_membership(self):
        # In mono membership mode: check crm_team_id / user_id is unique for active
        # memberships. Inactive memberships can create duplicate pairs which is whyy
        # we don't use a SQL constraint. Include "self" in search in case we use create
        # multi with duplicated user / team pairs in it.
        existing = self.env['crm.team.member'].search([
            ('crm_team_id', 'in', self.crm_team_id.ids),
            ('user_id', 'in', self.user_id.ids),
        ])
        duplicates = self.env['crm.team.member']
        for membership in self:
            duplicates += existing.filtered(
                lambda m: m.user_id == membership.user_id and m.crm_team_id == membership.crm_team_id and m.id != membership.id
            )
        if duplicates:
            raise exceptions.UserError(
                _("You are trying to create duplicate membership(s). We found that %(duplicates)s already exist(s).",
                  duplicates=", ".join("%s (%s)" % (m.user_id.name, m.crm_team_id.name) for m in duplicates)
                 ))

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

    @api.depends('is_membership_multi', 'active', 'user_id', 'crm_team_id')
    def _compute_member_warning(self):
        if all(m.is_membership_multi for m in self):
            self.member_warning = False
        else:
            active = self.filtered('active')
            (self - active).member_warning = False
            if active:
                existing = self.env['crm.team.member'].search([('user_id', 'in', active.user_id.ids)])
                user_mapping = dict.fromkeys(existing.user_id, self.env['crm.team'])
                for membership in existing:
                    user_mapping[membership.user_id] |= membership.crm_team_id

                for member in active:
                    teams = user_mapping.get(member.user_id, self.env['crm.team'])
                    remaining = teams - (member.crm_team_id | member._origin.crm_team_id)
                    member.member_warning = _("Adding %(user_name)s in this team would remove him/her from its current team %(team_names)s.",
                                              user_name=member.user_id.name,
                                              team_names=", ".join(remaining.mapped('name'))
                                             )

    @api.model_create_multi
    def create(self, values_list):
        """ Specific behavior implemented on create

          * mono membership mode: other user memberships are automatically
            archived (a warning already told it in form view);
          * creating a membership already existing as archived: do nothing as
            people can manage them from specific menu "Members";
        """
        is_membership_multi = self.env['ir.config_parameter'].sudo().get_param('sales_team.membership_multi', False)
        if is_membership_multi:
            return super(CrmTeamMember, self).create(values_list)

        existing = self.search([('user_id', 'in', [values['user_id'] for values in values_list])])
        user_memberships = dict.fromkeys(existing.user_id.ids, self.env['crm.team.member'])
        for membership in existing:
            user_memberships[membership.user_id.id] += membership

        existing_to_archive = self.env['crm.team.member']
        for values in values_list:
            to_archive = user_memberships.get(values['user_id'], self.env['crm.team.member']).filtered(
                lambda m: m.active and m.crm_team_id.id != values['crm_team_id']
            )
            existing_to_archive += to_archive

        if existing_to_archive:
            existing_to_archive.action_archive()

        return super(CrmTeamMember, self).create(values_list)

    # def write(self, values):
    #     if values.get('active'):
    #         pass
