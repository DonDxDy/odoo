# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import psycopg2

from odoo.addons.sales_team.tests.common import TestSalesMC
from odoo.tests.common import users
from odoo.tools import mute_logger


class TestDefaultTeam(TestSalesMC):
    """Tests to check if correct default team is found."""

    @classmethod
    def setUpClass(cls):
        """Set up data for default team tests."""
        super(TestDefaultTeam, cls).setUpClass()

        cls.team_sequence = cls.env['crm.team'].create({
            'name': 'Team LowSequence',
            'sequence': 0,
            'company_id': False,
        })
        cls.team_responsible = cls.env['crm.team'].create({
            'name': 'Team 3',
            'user_id': cls.user_sales_manager.id,
            'sequence': 3,
            'company_id': cls.company_main.id
        })

    def test_default_team_member(self):
        with self.with_user('user_sales_leads'):
            team = self.env['crm.team']._get_default_team_id()
            self.assertEqual(team, self.sales_team_1)

        # responsible with lower sequence better than member with higher sequence
        self.team_responsible.user_id = self.user_sales_leads.id
        with self.with_user('user_sales_leads'):
            team = self.env['crm.team']._get_default_team_id()
            self.assertEqual(team, self.team_responsible)

    def test_default_team_fallback(self):
        """ Test fallback: domain, order """
        self.sales_team_1.member_ids = [(5,)]
        self.sales_team_1.flush()

        with self.with_user('user_sales_leads'):
            team = self.env['crm.team']._get_default_team_id()
            self.assertEqual(team, self.team_sequence)

        # next one is team_responsible with sequence = 3 (team_c2 is in another company)
        self.team_sequence.active = False
        with self.with_user('user_sales_leads'):
            team = self.env['crm.team']._get_default_team_id()
            self.assertEqual(team, self.team_responsible)

        self.user_sales_leads.write({
            'company_ids': [(4, self.company_2.id)],
            'company_id': self.company_2.id,
        })
        # multi company: switch company
        self.user_sales_leads.write({'company_id': self.company_2.id})
        with self.with_user('user_sales_leads'):
            team = self.env['crm.team']._get_default_team_id()
            self.assertEqual(team, self.team_c2)


class TestMembership(TestSalesMC):
    """Tests to ensure membership behavior """

    @classmethod
    def setUpClass(cls):
        super(TestMembership, cls).setUpClass()
        cls.new_team = cls.env['crm.team'].create({
            'name': 'Test Specific',
            'sequence': 10,
        })
        cls.env['ir.config_parameter'].set_param('sales_team.membership_multi', True)

    @users('user_sales_manager')
    def test_fields(self):
        self.assertTrue(self.sales_team_1.with_user(self.env.user).is_membership_multi)
        self.assertTrue(self.team_c2.with_user(self.env.user).is_membership_multi)

    @users('user_sales_manager')
    def test_members_mono(self):
        """ Test mono mode using the user m2m relationship """
        self.env['ir.config_parameter'].sudo().set_param('sales_team.membership_multi', False)
        # ensure initial data
        sales_team_1 = self.sales_team_1.with_user(self.env.user)
        new_team = self.new_team.with_user(self.env.user)
        self.assertEqual(sales_team_1.member_ids, self.user_sales_leads | self.user_admin)

        # test various add / remove on computed m2m
        self.assertEqual(new_team.member_ids, self.env['res.users'])
        new_team.write({'member_ids': [(4, self.env.uid)]})
        self.assertEqual(new_team.member_ids, self.env.user)
        new_team.write({'member_ids': [(4, self.user_sales_leads.id)]})
        self.assertEqual(new_team.member_ids, self.env.user | self.user_sales_leads)
        new_team.write({'member_ids': [(3, self.user_sales_leads.id)]})
        self.assertEqual(new_team.member_ids, self.env.user)
        new_team.write({'member_ids': [(6, 0, (self.user_sales_leads | self.env.user).ids)]})
        self.assertEqual(new_team.member_ids, self.env.user | self.user_sales_leads)

        # create a new user on the fly, just for testing
        self.user_sales_manager.write({'groups_id': [(4, self.env.ref('base.group_system').id)]})
        new_team.write({'member_ids': [(0, 0, {
            'name': 'Marty OnTheMCFly',
            'login': 'mcfly@test.example.com',
        })]})
        new_user = self.env['res.users'].search([('login', '=', 'mcfly@test.example.com')])
        self.assertTrue(len(new_user))
        self.assertEqual(new_team.member_ids, self.env.user | self.user_sales_leads | new_user)
        self.user_sales_manager.write({'groups_id': [(3, self.env.ref('base.group_system').id)]})

        new_team.flush()
        memberships = self.env['crm.team.member'].with_context(active_test=False).search([('user_id', '=', self.user_sales_leads.id)])
        self.assertEqual(memberships.crm_team_id, sales_team_1 | new_team)
        self.assertFalse(memberships.filtered(lambda m: m.crm_team_id == sales_team_1).active)
        self.assertTrue(memberships.filtered(lambda m: m.crm_team_id == new_team).active)

    @users('user_sales_manager')
    def test_memberships_mono(self):
        """ Test mono mode: updating crm_team_member_ids field """
        self.env['ir.config_parameter'].sudo().set_param('sales_team.membership_multi', False)
        # ensure initial data
        sales_team_1 = self.env['crm.team'].browse(self.sales_team_1.ids)
        new_team = self.env['crm.team'].browse(self.new_team.ids)
        self.assertEqual(sales_team_1.member_ids, self.user_sales_leads | self.user_admin)

        # subscribe on new team (user_sales_leads will have two memberships -> old one deactivated)
        self.assertEqual(new_team.member_ids, self.env['res.users'])
        new_team.write({'crm_team_member_ids': [
            (0, 0, {'user_id': self.user_sales_leads.id}),
            (0, 0, {'user_id': self.uid}),
        ]})
        self.assertEqual(new_team.member_ids, self.env.user | self.user_sales_leads)
        self.assertEqual(sales_team_1.member_ids, self.user_admin)
        new_team.flush()

        memberships = self.env['crm.team.member'].with_context(active_test=False).search([('user_id', '=', self.user_sales_leads.id)])
        self.assertEqual(memberships.crm_team_id, sales_team_1 | new_team)
        self.assertFalse(memberships.filtered(lambda m: m.crm_team_id == sales_team_1).active)
        self.assertTrue(memberships.filtered(lambda m: m.crm_team_id == new_team).active)

        # subscribe user_sales_leads on old team -> old membership should be unlinked
        sales_team_1.write({'crm_team_member_ids': [(0, 0, {'user_id': self.user_sales_leads.id})]})
        memberships = self.env['crm.team.member'].with_context(active_test=False).search([('id', 'in', memberships.ids)])
        self.assertEqual(len(memberships), 1)
        self.assertEqual(memberships.crm_team_id, new_team)
        self.assertEqual(memberships.active, False)
        self.assertEqual(new_team.member_ids, self.env.user)
        self.assertEqual(sales_team_1.member_ids, self.user_admin | self.user_sales_leads)

    @users('user_sales_manager')
    def test_memberships_sync(self):
        sales_team_1 = self.env['crm.team'].browse(self.sales_team_1.ids)
        new_team = self.env['crm.team'].browse(self.new_team.ids)
        self.assertEqual(sales_team_1.member_ids, self.user_sales_leads | self.user_admin)
        self.assertEqual(new_team.crm_team_member_ids, self.env['crm.team.member'])
        self.assertEqual(new_team.crm_team_member_all_ids, self.env['crm.team.member'])
        self.assertEqual(new_team.member_ids, self.env['res.users'])

        # creating memberships correctly updates m2m without any refresh
        new_member = self.env['crm.team.member'].create({
            'user_id': self.env.user.id,
            'crm_team_id': self.new_team.id,
        })
        self.assertEqual(new_team.crm_team_member_ids, new_member)
        self.assertEqual(new_team.crm_team_member_all_ids, new_member)
        self.assertEqual(new_team.member_ids, self.env.user)

        # adding members correctly update o2m with right values
        new_team.write({
            'member_ids': [(4, self.user_sales_leads.id)]
        })
        added = self.env['crm.team.member'].search([('crm_team_id', '=', new_team.id), ('user_id', '=', self.user_sales_leads.id)])
        self.assertEqual(new_team.crm_team_member_ids, new_member + added)
        self.assertEqual(new_team.crm_team_member_all_ids, new_member + added)
        self.assertEqual(new_team.member_ids, self.env.user | self.user_sales_leads)

        # archiving membership correctly updates m2m and o2m
        added.write({'active': False})
        self.assertEqual(new_team.crm_team_member_ids, new_member)
        self.assertEqual(new_team.crm_team_member_all_ids, new_member + added)
        self.assertEqual(new_team.member_ids, self.env.user)

        # reactivating correctly updates m2m and o2m
        added.write({'active': True})
        self.assertEqual(new_team.crm_team_member_ids, new_member + added)
        self.assertEqual(new_team.crm_team_member_all_ids, new_member + added)
        self.assertEqual(new_team.member_ids, self.env.user | self.user_sales_leads)

        # archived are erased if duplicated on write
        admin_original = self.env['crm.team.member'].search([
            ('crm_team_id', '=', sales_team_1.id),
            ('user_id', '=', self.user_admin.id)
        ])
        self.assertTrue(bool(admin_original))
        admin_archived = self.env['crm.team.member'].create({
            'crm_team_id': new_team.id,
            'user_id': self.user_admin.id,
            'active': False,
        })
        admin_original.write({'crm_team_id': new_team.id})
        # send to db as errors may pop at that step (like trying to set NULL on a m2o inverse of o2m)
        self.new_team.flush()
        self.assertFalse(admin_archived.exists())


        # change team of membership should raise unicity constraint
        with self.assertRaises(psycopg2.IntegrityError), mute_logger('odoo.sql_db'):
            added.write({'crm_team_id': sales_team_1.id})
            self.new_team.flush()

    def test_users_sale_team_id(self):
        self.assertTrue(self.sales_team_1.sequence < self.new_team.sequence)

        self.assertEqual(self.user_sales_leads.crm_team_ids, self.sales_team_1)
        self.assertEqual(self.user_sales_leads.sale_team_id, self.sales_team_1)

        # subscribe to new team -> default team is still the old one
        self.new_team.write({
            'member_ids': [(4, self.user_sales_leads.id)]
        })
        self.assertEqual(self.user_sales_leads.crm_team_ids, self.sales_team_1 | self.new_team)
        self.assertEqual(self.user_sales_leads.sale_team_id, self.sales_team_1)

        # archive membership to first team -> second one becomes default
        self.sales_team_1_m1.write({'active': False})
        self.assertEqual(self.user_sales_leads.crm_team_ids, self.new_team)
        self.assertEqual(self.user_sales_leads.sale_team_id, self.new_team)

        # activate membership to first team -> first one becomes default again
        self.sales_team_1_m1.write({'active': True})
        self.assertEqual(self.user_sales_leads.crm_team_ids, self.sales_team_1 | self.new_team)
        self.assertEqual(self.user_sales_leads.sale_team_id, self.sales_team_1)

        # keep only one membership -> default team
        self.sales_team_1_m1.unlink()
        self.assertEqual(self.user_sales_leads.crm_team_ids, self.new_team)
        self.assertEqual(self.user_sales_leads.sale_team_id, self.new_team)
