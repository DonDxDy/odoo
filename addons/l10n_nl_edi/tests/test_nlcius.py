# -*- coding: utf-8 -*-
from odoo.addons.account_edi.tests.common import AccountEdiTestCommon


class TestUBL(AccountEdiTestCommon):

    @classmethod
    def setUpClass(cls, chart_template_ref='l10n_nl.l10nnl_chart_template', edi_format_ref='l10n_nl_edi.edi_nlcius_1'):
        super().setUpClass(chart_template_ref=chart_template_ref, edi_format_ref=edi_format_ref)

        cls.partner_a.l10n_nl_kvk = '77777677'

    def test_invoice_edi_xml(self):
        invoice = self.env['account.move'].with_context(default_move_type='in_invoice').create({})
        invoice_count = len(self.env['account.move'].search([]))
        self.update_invoice_from_file('l10n_nl_edi', 'test_xml_file', 'nlcius_test.xml', invoice)

        self.assertEqual(len(self.env['account.move'].search([])), invoice_count)
        self.assertEqual(invoice.amount_total, 387.2)
        self.assertEqual(invoice.amount_tax, 67.2)
        self.assertEqual(invoice.partner_id, self.partner_a)
