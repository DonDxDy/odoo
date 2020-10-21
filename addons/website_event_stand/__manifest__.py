# -*- coding: utf-8 -*-

{
    'name': 'Events Physical Stand',
    'category': 'Marketing/Events',
    'version': '1.0',
    'summary': 'Events, sell physical stands',
    'depends': ['website_event', 'event_sale', 'website_sale'],
    'data': [
        'security/ir.model.access.csv',

        'data/product_data.xml',

        'views/assets.xml',
        'views/event_stand_slot_views.xml',
        'views/event_stand_views.xml',
        'views/event_views.xml',
        'views/event_type_views.xml',
        'views/product_views.xml',
        'views/sale_order_views.xml',

        'views/website_event_stand_templates_stands.xml',

        'wizard/event_stand_configurator_views.xml',
    ],
    'demo': [
        'data/event_stand_demo.xml',
    ],
}
