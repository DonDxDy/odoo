# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.addons.crm.tests.common import TestCrmCommon
from odoo.tests import HttpCase
from odoo.tests.common import tagged, users


@tagged('post_install', '-at_install')
class TestUi(HttpCase):

    def test_01_crm_tour(self):
        self.start_tour("/web", 'crm_tour', login="admin")


class TestCRMLeadMisc(TestCrmCommon):

    @users('user_sales_leads')
    def test_team_my_pipeline(self):
        action = self.env['crm.team'].action_your_pipeline()
