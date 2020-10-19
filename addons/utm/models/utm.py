# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import uuid

from odoo import fields, models, api, tools, SUPERUSER_ID


class UtmMedium(models.Model):
    _name = 'utm.medium'
    _description = 'UTM Medium'
    _order = 'name'
    _inherit = ['utm.object']

    active = fields.Boolean(default=True)


class UtmCampaign(models.Model):
    # OLD crm.case.resource.type
    _name = 'utm.campaign'
    _description = 'UTM Campaign'
    _inherit = ['utm.object']

    user_id = fields.Many2one(
        'res.users', string='Responsible',
        required=True, default=lambda self: self.env.uid)
    stage_id = fields.Many2one('utm.stage', string='Stage', ondelete='restrict', required=True,
        default=lambda self: self.env['utm.stage'].search([], limit=1),
        group_expand='_group_expand_stage_ids')
    tag_ids = fields.Many2many(
        'utm.tag', 'utm_tag_rel',
        'tag_id', 'campaign_id', string='Tags')

    is_website = fields.Boolean(default=False, help="Allows us to filter relevant Campaign")
    color = fields.Integer(string='Color Index')

    @api.model
    def _group_expand_stage_ids(self, stages, domain, order):
        """ Read group customization in order to display all the stages in the
            kanban view, even if they are empty
        """
        stage_ids = stages._search([], order=order, access_rights_uid=SUPERUSER_ID)
        return stages.browse(stage_ids)

class UtmSource(models.Model):
    _name = 'utm.source'
    _description = 'UTM Source'
    _inherit = ['utm.object']

    def _generate_name(self, record, content):
        """Generate the UTM source name based on the content of the source."""
        if len(content) > 25:
            content = f'{content[:25]}...'

        create_date = record.create_date or fields.date.today()
        create_date = fields.date.strftime(create_date, tools.DEFAULT_SERVER_DATE_FORMAT)
        return f'{content} ({record._description} created on {create_date})'

    def _generate_identifier(self, record):
        """Generate the UTM source identifier based on the record."""
        return f'{record._table}_{str(uuid.uuid4())[:8]}'


class UtmStage(models.Model):

    """Stage for utm campaigns. """
    _name = 'utm.stage'
    _description = 'Campaign Stage'
    _order = 'sequence'

    name = fields.Char(required=True, translate=True)
    sequence = fields.Integer()

class UtmTag(models.Model):
    """Model of categories of utm campaigns, i.e. marketing, newsletter, ... """
    _name = 'utm.tag'
    _description = 'UTM Tag'
    _order = 'name'

    name = fields.Char(required=True, translate=True)
    color = fields.Integer(string='Color Index')

    _sql_constraints = [
            ('name_uniq', 'unique (name)', "Tag name already exists !"),
    ]
