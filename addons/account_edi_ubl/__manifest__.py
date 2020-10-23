# -*- coding: utf-8 -*-
{
    'name': 'Import/Export base for UBL',
    'description': '''
    Mother module of modules that import/export in UBL.
    ''',
    'version': '1.0',
    'category': 'Accounting/Accounting',
    'depends': ['account_edi'],
    'data': [
        'data/ubl_templates.xml',
        'data/en_16931_templates.xml',
    ],
    'installable': True,
    'application': False,
}
