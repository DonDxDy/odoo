# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'Localization Demo Data',
    'version': '1.0',
    'summary': 'Invoices & Payments demo data',
    'category': 'Hidden',
    'depends': ['account'],
    'demo': [
        'demo/account_bank_statement_demo.xml',
        'demo/account_invoice_demo.xml',
        'demo/account_reconcile_model.xml',
    ],
    'auto_install': False,
}
