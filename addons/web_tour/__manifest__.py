# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Tours',
    'category': 'Hidden',
    'description': """
Odoo Web tours.
========================

""",
    'version': '0.1',
    'depends': ['web'],
    'data': [
        'security/ir.model.access.csv',
        'security/ir.rule.csv',
        'views/tour_templates.xml',
        'views/tour_views.xml'
    ],
    'assets': {
        'qweb': [
            "static/src/xml/debug_manager.xml",
        ],
        'assets_common': [
            'web_tour/static/src/scss/tip.scss',
            'web_tour/static/src/js/tip.js',
            'web_tour/static/src/js/tour_utils.js',
            'web_tour/static/src/js/running_tour_action_helper.js',
            'web_tour/static/src/js/tour_manager.js',
            'web_tour/static/src/js/tour_service.js',
            'web_tour/static/src/js/tour_step_utils.js',
        ],
        'assets_backend': [
            'web_tour/static/src/js/debug_manager.js',
        ],
        'assets_frontend': [
            'web_tour/static/src/js/public/tour_manager.js',
        ],
        'qunit_suite_tests': [
            'web_tour/static/tests/tour_manager_tests.js',
        ],
    },
    'auto_install': True
}
