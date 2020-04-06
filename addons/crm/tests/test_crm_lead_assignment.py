# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.addons.crm.tests.common import TestLeadConvertCommon
from odoo.tests.common import tagged, users


@tagged('lead_assign')
class TestLeadAssign(TestLeadConvertCommon):
    """ Test lead assignment feature added in saas-13.5. """

    @classmethod
    def setUpClass(cls):
        super(TestLeadAssign, cls).setUpClass()
        cls._switch_to_multi_membership()

        # don't mess with existing teams, deactivate them to make tests repeatable
        cls.sales_teams = cls.sales_team_1 + cls.sales_team_convert
        cls.members = cls.sales_team_1_m1 | cls.sales_team_1_m2 | cls.sales_team_1_m3 | cls.sales_team_convert_m1 | cls.sales_team_convert_m2
        cls.env['crm.team'].search([('id', 'not in', cls.sales_teams.ids)]).write({'active': False})

        # don't mess with existing leads, deactivate those assigned to users used here to make tests repeatable
        cls.env['crm.lead'].search([('user_id', 'in', cls.sales_teams.member_ids.ids)]).write({'active': False})
        cls.bundle_size = 5
        cls.env['ir.config_parameter'].set_param('crm.assignment.bundle', '%s' % cls.bundle_size)
        cls.env['ir.config_parameter'].set_param('crm.assignment.delay', '0')

    def assertInitialData(self):
        self.assertEqual(self.sales_team_1.assignment_max, 75)
        self.assertEqual(self.sales_team_convert.assignment_max, 90)
        # ensure domains
        self.assertEqual(self.sales_team_1_m1.assignment_domain, False)
        self.assertEqual(self.sales_team_1_m2.assignment_domain, "[('priority', 'in', ['1', '2'])]")
        self.assertEqual(self.sales_team_1_m3.assignment_domain, False)
        self.assertEqual(self.sales_team_convert_m1.assignment_domain, "[('probability', '>=', 30)]")
        self.assertEqual(self.sales_team_convert_m2.assignment_domain, False)
        # no need assigned
        self.assertEqual(self.sales_team_1_m1.lead_month_count, 0)
        self.assertEqual(self.sales_team_1_m2.lead_month_count, 0)
        self.assertEqual(self.sales_team_1_m3.lead_month_count, 0)
        self.assertEqual(self.sales_team_convert_m1.lead_month_count, 0)
        self.assertEqual(self.sales_team_convert_m2.lead_month_count, 0)

    def test_crm_team_assign_duplicates(self):
        leads = self._create_leads_batch(lead_type='lead', user_ids=[False], partner_ids=[self.contact_1.id, self.contact_2.id, False], count=45)
        self.assertInitialData()

        # assign probability to leads (bypass auto probability as purpose is not to test pls)
        leads = self.env['crm.lead'].search([('id', 'in', leads.ids)])  # ensure order
        for idx in range(0, 5):
            sliced_leads = leads[idx:len(leads):5]
            for lead in sliced_leads:
                lead.probability = (idx + 1) * 10 * ((int(lead.priority) + 1) / 2)

        with self.with_user('user_sales_manager'):
            with self.assertQueryCount(user_sales_manager=999):  # 333
                self.env['crm.team'].cron_assign_leads()

        self.members.invalidate_cache(fnames=['lead_month_count'])
        self.assertEqual(self.sales_team_1_m1.lead_month_count, 3)  # 45 max on 2 days
        self.assertEqual(self.sales_team_1_m2.lead_month_count, 1)  # 15 max on 2 days
        self.assertEqual(self.sales_team_1_m3.lead_month_count, 1)  # 15 max on 2 days
        self.assertEqual(self.sales_team_convert_m1.lead_month_count, 2)  # 30 max on 15
        self.assertEqual(self.sales_team_convert_m2.lead_month_count, 4)  # 60 max on 15

        # deduplicate should have removed all duplicated linked to contact_1 / contact_2
        new_assigned_leads_wpartner = self.env['crm.lead'].search([
            ('partner_id', 'in', (self.contact_1 | self.contact_2).ids),
            ('id', 'in', leads.ids)
        ])
        self.assertEqual(len(new_assigned_leads_wpartner), 2)

    def test_crm_team_assign_no_duplicates(self):
        leads = self._create_leads_batch(lead_type='lead', user_ids=[False], partner_ids=[False], count=45)
        self.assertInitialData()

        # assign probability to leads (bypass auto probability as purpose is not to test pls)
        leads = self.env['crm.lead'].search([('id', 'in', leads.ids)])  # ensure order
        for idx in range(0, 5):
            sliced_leads = leads[idx:len(leads):5]
            for lead in sliced_leads:
                lead.probability = (idx + 1) * 10 * ((int(lead.priority) + 1) / 2)

        with self.with_user('user_sales_manager'):
            with self.assertQueryCount(user_sales_manager=999):  # 333
                self.env['crm.team'].cron_assign_leads()

        self.members.invalidate_cache(fnames=['lead_month_count'])
        self.assertEqual(self.sales_team_1_m1.lead_month_count, 3)  # 45 max on 2 days
        self.assertEqual(self.sales_team_1_m2.lead_month_count, 1)  # 15 max on 2 days
        self.assertEqual(self.sales_team_1_m3.lead_month_count, 1)  # 15 max on 2 days
        self.assertEqual(self.sales_team_convert_m1.lead_month_count, 2)  # 30 max on 15
        self.assertEqual(self.sales_team_convert_m2.lead_month_count, 4)  # 60 max on 15
