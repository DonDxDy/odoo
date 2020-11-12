

# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Wowl',
    'category': 'Hidden',
    'version': '1.0',
    'description':
        """
Odoo Web core module written in Owl.
        """,
    'depends': [
        'base',
        'web'  # LPE temporary: we call some assets defined there
    ],
    'auto_install': True,
    'data': [
        'views/templates.xml',
    ],
    'assets': {
        'owl_qweb': [
            'wowl/static/src/components/**/*',
            'wowl/static/src/views/**/*',
        ],
        'style': [
            'wowl/static/src/utils/**/*',
            'wowl/static/src/components/**/*',
            'wowl/static/src/views/**/*',
            'wowl/static/src/services/**/*',
        ],
    },
}
