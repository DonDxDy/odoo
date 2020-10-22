# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Lead Enrichment',
    'summary': 'Enrich Leads/Opportunities using email address domain',
    'version': '1.1',
    'category': 'Sales/CRM',
    'version': '1.1',
    'depends': [
        'iap_crm',
        'iap_mail',
        'base_automation'
    ],
    'data': [
        'data/base_automation_data.xml',
        'data/ir_action.xml',
        'data/mail_data.xml',
        'views/crm_lead_views.xml',
        'views/res_config_settings_view.xml',
    ],
    'post_init_hook': '_synchronize_action',
    'auto_install': True,
}
