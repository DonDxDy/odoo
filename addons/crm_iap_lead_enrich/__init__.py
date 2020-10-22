# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from . import models

from odoo.api import Environment, SUPERUSER_ID


def _synchronize_action(cr, registry):
    env = Environment(cr, SUPERUSER_ID, {'active_test': False})
    action = env.ref('crm_iap_lead_enrich.base_automation_lead_enrichment')
    if action:
        config = env['ir.config_parameter'].get_param('crm.iap.lead.enrich.setting', 'manual')
        action.active = config != 'manual'
