# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.addons.crm.tests import common as crm_common
from odoo.tests.common import tagged, users


@tagged('lead_manage')
class TestCrmRule(crm_common.TestLeadConvertMassCommon):

    @classmethod
    def setUpClass(cls):
        super(TestCrmRule, cls).setUpClass()
        cls.tag_spam = cls.env['crm.tag'].create({'name': 'Test_spam', 'rule_tag': True})
        cls.rule_tag_0 = cls.env['crm.rule'].create({
            'name': 'Rule: Tag',
            'rule_type': 'tag',
            'rule_domain': [('priority', 'in', ['0', '1'])],
            'crm_tag_id': cls.tag_spam.id,
        })

    @users('user_sales_manager')
    def test_assignment_salesmen(self):
        test_leads = self._create_leads_batch(count=50, user_ids=[False])
        untouched_ids = test_leads.filtered(lambda lead: lead.priority in ['2', '3']).ids

        self.rule_tag_0._run_on_leads(lead_ids=test_leads.ids)

        print(self.env['crm.lead'].browse(untouched_ids).tag_ids)
        print(self.env['crm.lead'].browse(list(set(test_leads.ids) - set(untouched_ids))).tag_ids)
