# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'CRM Automatic Rules',
    'version': '1.0',
    'category': 'Sales/CRM',
    'summary': 'Add automatic rules for leads',
    'description': "",
    'depends': ['crm'],
    'data': [
        'security/ir.model.access.csv',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}
