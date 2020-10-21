# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.addons.event.test.common import TestEventCommon


class TestEventStandCommon(TestEventCommon):

    @classmethod
    def setUpClass(cls):
        super(TestEventStandCommon, cls).setUpClass()

        cls.stand_product = cls.env['product.product'].create({
            'name': 'Test Stand Product',
            'is_event_stand': True,
            'standard_price': 100.0,
            'type': 'service',
        })
