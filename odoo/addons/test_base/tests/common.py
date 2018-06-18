# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.tests import common

class TransactionCaseCommon(common.TransactionCase):

    def setUp(self):
        super(TransactionCaseCommon, self).setUp()
        user_group_employee = self.env.ref('base.group_user')
        user_group_partner_manager = self.env.ref('base.group_partner_manager')
        self.user_test = self.env['res.users'].create({
            'name': 'Test User',
            'login': 'test',
            'email': 'test@example.com',
            'signature': '--\nTest',
            'groups_id': [(6, 0, [user_group_employee.id, user_group_partner_manager.id])]})
