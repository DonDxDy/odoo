# -*- coding: utf-8 -*-
import logging
import time
from datetime import timedelta
from dateutil.relativedelta import relativedelta
import base64

from odoo import api, fields, models
from odoo.exceptions import UserError, ValidationError
from odoo.tools.misc import file_open

_logger = logging.getLogger(__name__)


class AccountChartTemplate(models.Model):
    _inherit = "account.chart.template"

    @api.model
    def _get_demo_data(self):
        cid = self.env.company.id
        ref = self.env.ref
        yield ('account.move', [
            (f'{cid}_demo_invoice_1', {
                'move_type': 'out_invoice',
                'partner_id': ref('base.res_partner_12').id,
                'invoice_user_id': ref('base.user_demo').id,
                'invoice_payment_term_id': ref('account.account_payment_term_end_following_month').id,
                'invoice_date': time.strftime('%Y-%m')+'-01',
                'invoice_line_ids': [
                    (0, 0, {'product_id': ref('product.consu_delivery_02').id, 'quantity': 5}),
                    (0, 0, {'product_id': ref('product.consu_delivery_03').id, 'quantity': 5}),
                ],
            }),
            (f'{cid}_demo_invoice_2', {
                'move_type': 'out_invoice',
                'partner_id': ref('base.res_partner_2').id,
                'invoice_user_id': False,
                'invoice_date': time.strftime('%Y-%m')+'-08',
                'invoice_line_ids': [
                    (0, 0, {'product_id': ref('product.consu_delivery_03').id, 'quantity': 5}),
                    (0, 0, {'product_id': ref('product.consu_delivery_01').id, 'quantity': 20}),
                ],
            }),
            (f'{cid}_demo_invoice_3', {
                'move_type': 'out_invoice',
                'partner_id': ref('base.res_partner_2').id,
                'invoice_user_id': False,
                'invoice_date': time.strftime('%Y-%m')+'-08',
                'invoice_line_ids': [
                    (0, 0, {'product_id': ref('product.consu_delivery_01').id, 'quantity': 5}),
                    (0, 0, {'product_id': ref('product.consu_delivery_03').id, 'quantity': 5}),
                ],
            }),
            (f'{cid}_demo_invoice_followup', {
                'move_type': 'out_invoice',
                'partner_id': ref('base.res_partner_2').id,
                'invoice_user_id': ref('base.user_demo').id,
                'invoice_payment_term_id': ref('account.account_payment_term_immediate').id,
                'invoice_date': (fields.Date.today() + timedelta(days=-15)).strftime('%Y-%m-%d'),
                'invoice_line_ids': [
                    (0, 0, {'product_id': ref('product.consu_delivery_02').id, 'quantity': 5}),
                    (0, 0, {'product_id': ref('product.consu_delivery_03').id, 'quantity': 5}),
                ],
            }),
            (f'{cid}_demo_invoice_5', {
                'move_type': 'in_invoice',
                'partner_id': ref('base.res_partner_12').id,
                'invoice_user_id': ref('base.user_demo').id,
                'invoice_payment_term_id': ref('account.account_payment_term_end_following_month').id,
                'invoice_date': time.strftime('%Y-%m')+'-01',
                'invoice_line_ids': [
                    (0, 0, {'product_id': ref('product.product_delivery_01'), 'price_unit': 10.0, 'quantity': 1}),
                    (0, 0, {'product_id': ref('product.product_order_01'), 'price_unit': 4.0, 'quantity': 5}),
                ],
            }),
            (f'{cid}_demo_invoice_extract', {
                'move_type': 'in_invoice',
                'invoice_user_id': ref('base.user_demo').id,
            }),
            (f'{cid}_demo_invoice_equipment_purchase', {
                'move_type': 'in_invoice',
                'ref': 'INV/2018/0057',
                'partner_id': ref('base.res_partner_12').id,
                'invoice_user_id': False,
                'invoice_date': '2018-09-17',
                'invoice_line_ids': [
                    (0, 0, {'name': 'Redeem Reference Number: PO02529', 'quantity': 1, 'price_unit': 541.10}),
                ],
            })
        ])
        yield ('account.bank.statement', [
            (f'{cid}_demo_bank_statement_1', {
                'journal_id': self.env['account.journal'].search([('type', '=', 'bank')], limit=1).id,
                'date': time.strftime('%Y')+'-01-01',
                'balance_end_real': 9944.87,
                'balance_start': 5103.0,
                'line_ids': [
                    (0, 0, {
                        'payment_ref': 'INV/%s/00002 and INV/%s/00003' % (time.strftime('%Y'), time.strftime('%Y')),
                        'amount': 1275.0,
                        'date': time.strftime('%Y')+'-01-01',
                        'partner_id': ref('base.res_partner_12').id
                    }),
                    (0, 0, {
                        'payment_ref': 'Bank Fees',
                        'amount': -32.58,
                        'date': time.strftime('%Y')+'-01-01',
                    }),
                    (0, 0, {
                        'payment_ref': 'Prepayment',
                        'amount': 650,
                        'date': time.strftime('%Y')+'-01-01',
                        'partner_id': ref('base.res_partner_12').id
                    }),
                    (0, 0, {
                        'payment_ref': 'First 2000 $ of invoice %s/00001' % time.strftime('%Y'),
                        'amount': 2000,
                        'date': time.strftime('%Y')+'-01-01',
                        'partner_id': ref('base.res_partner_12').id
                    }),
                    (0, 0, {
                        'payment_ref': 'Last Year Interests',
                        'amount': 102.78,
                        'date': time.strftime('%Y')+'-01-01',
                    }),
                    (0, 0, {
                        'payment_ref': 'INV/'+time.strftime('%Y')+'/00002',
                        'amount': 750,
                        'date': time.strftime('%Y')+'-01-01',
                        'partner_id': ref('base.res_partner_2').id
                    }),
                    (0, 0, {
                        'payment_ref': 'R:9772938  10/07 AX 9415116318 T:5 BRT: 100,00€ C/ croip',
                        'amount': 96.67,
                        'date': time.strftime('%Y')+'-01-01',
                        'partner_id': ref('base.res_partner_2').id
                    }),
                ]
            }),
        ])
        yield ('account.reconcile.model', [
            (f'{cid}_reconcile_from_label', {
                'name': 'Line with Bank Fees',
                'rule_type': 'writeoff_suggestion',
                'match_label': 'contains',
                'match_label_param': 'BRT',
                'decimal_separator': ',',
                'line_ids': [
                    (0, 0, {
                        'label': 'Due amount',
                        'account_id': self._get_demo_account(
                            'income',
                            'account.data_account_type_revenue',
                            self.env.company,
                        ).id,
                        'amount_type': 'regex',
                        'amount_string': r'BRT: ([\d,]+)',
                    }),
                    (0, 0, {
                        'label': 'Bank Fees',
                        'account_id': self._get_demo_account(
                            'cost_of_goods_sold',
                            'account.data_account_type_direct_costs',
                            self.env.company,
                        ).id,
                        'amount_type': 'percentage',
                        'amount_string': '100',
                    }),
                ]
            }),
        ])
        yield ('ir.attachment', [
            (f'{cid}_ir_attachment_bank_statement_1', {
                'type': 'binary',
                'name': 'bank_statement_yourcompany_demo.pdf',
                'res_model': 'account.bank.statement',
                'res_id': ref(f'account.{cid}_demo_bank_statement_1').id,
                'datas': base64.b64encode(file_open(
                    'account/static/demo/bank_statement_yourcompany_1.pdf', 'rb'
                ).read())
            }),
            (f'{cid}_ir_attachment_in_invoice_1', {
                'type': 'binary',
                'name': 'in_invoice_yourcompany_demo.pdf',
                'res_model': 'account.move',
                'res_id': ref(f'account.{cid}_demo_invoice_extract').id,
                'datas': base64.b64encode(file_open(
                    'account/static/demo/in_invoice_yourcompany_demo_1.pdf', 'rb'
                ).read())
            }),
            (f'{cid}_ir_attachment_in_invoice_2', {
                'type': 'binary',
                'name': 'in_invoice_yourcompany_demo.pdf',
                'res_model': 'account.move',
                'res_id': ref(f'account.{cid}_demo_invoice_equipment_purchase').id,
                'datas': base64.b64encode(file_open(
                    'account/static/demo/in_invoice_yourcompany_demo_2.pdf', 'rb'
                ).read())
            }),
        ])
        yield ('mail.message', [
            (f'{cid}_mail_message_bank_statement_1', {
                'model': 'account.bank.statement',
                'res_id': ref(f'account.{cid}_demo_bank_statement_1').id,
                'body': 'Bank statement attachment',
                'message_type': 'comment',
                'author_id': ref('base.partner_demo').id,
                'attachment_ids': [(6, 0, [
                    ref(f'account.{cid}_ir_attachment_bank_statement_1').id
                ])]
            }),
            (f'{cid}_mail_message_in_invoice_1', {
                'model': 'account.move',
                'res_id': ref(f'account.{cid}_demo_invoice_extract').id,
                'body': 'Vendor Bill attachment',
                'message_type': 'comment',
                'author_id': ref('base.partner_demo').id,
                'attachment_ids': [(6, 0, [
                    ref(f'account.{cid}_ir_attachment_in_invoice_1').id
                ])]
            }),
            (f'{cid}_mail_message_in_invoice_2', {
                'model': 'account.move',
                'res_id': ref(f'account.{cid}_demo_invoice_equipment_purchase').id,
                'body': 'Vendor Bill attachment',
                'message_type': 'comment',
                'author_id': ref('base.partner_demo').id,
                'attachment_ids': [(6, 0, [
                    ref(f'account.{cid}_ir_attachment_in_invoice_2').id
                ])]
            }),
        ])
        yield ('mail.activity', [
            (f'{cid}_invoice_activity_1', {
                'res_id': ref(f'account.{cid}_demo_invoice_3').id,
                'res_model_id': ref('account.model_account_move').id,
                'activity_type_id': ref('mail.mail_activity_data_todo').id,
                'date_deadline': (fields.Datetime.today() + relativedelta(days=5)).strftime('%Y-%m-%d %H:%M'),
                'summary': 'Follow-up on payment',
                'create_uid': ref('base.user_admin').id,
                'user_id': ref('base.user_admin').id,
            }),
            (f'{cid}_invoice_activity_2', {
                'res_id': ref(f'account.{cid}_demo_invoice_2').id,
                'res_model_id': ref('account.model_account_move').id,
                'activity_type_id': ref('mail.mail_activity_data_call').id,
                'date_deadline': fields.Datetime.today().strftime('%Y-%m-%d %H:%M'),
                'create_uid': ref('base.user_admin').id,
                'user_id': ref('base.user_admin').id,
            }),
            (f'{cid}_invoice_activity_3', {
                'res_id': ref(f'account.{cid}_demo_invoice_1').id,
                'res_model_id': ref('account.model_account_move').id,
                'activity_type_id': ref('mail.mail_activity_data_todo').id,
                'date_deadline': (fields.Datetime.today() + relativedelta(days=5)).strftime('%Y-%m-%d %H:%M'),
                'summary': 'Include upsell',
                'create_uid': ref('base.user_admin').id,
                'user_id': ref('base.user_admin').id,
            }),
            (f'{cid}_invoice_activity_4', {
                'res_id': ref(f'account.{cid}_demo_invoice_extract').id,
                'res_model_id': ref('account.model_account_move').id,
                'activity_type_id': ref('mail.mail_activity_data_todo').id,
                'date_deadline': (fields.Datetime.today() + relativedelta(days=5)).strftime('%Y-%m-%d %H:%M'),
                'summary': 'Update address',
                'create_uid': ref('base.user_admin').id,
                'user_id': ref('base.user_admin').id,
            }),
        ])

    @api.model
    def _post_create_demo_data(self, created):
        cid = self.env.company.id
        if created._name == 'account.move':
            created = created.with_context(check_move_validity=False)
            for move in created:
                move._onchange_partner_id()

            created.line_ids._onchange_product_id()
            created.line_ids._onchange_account_id()

            created._recompute_dynamic_lines()

            for move in created - self.env.ref(f'account.{cid}_demo_invoice_extract'):
                try:
                    move.action_post()
                except (UserError, ValidationError):
                    _logger.exception('Error while posting demo data')
        elif created._name == 'account.bank.statement':
            created.button_post()

    @api.model
    def _get_demo_account(self, xml_id, user_type_id, company):
        """Find the most appropriate account possible for demo data creation.

        :param xml_id (str): the xml_id of the account template in the generic coa
        :param user_type_id (str): the full xml_id of the account type wanted
        :param company (Model<res.company>): the company for which we search the account
        :return (Model<account.account>): the most appropriate record found
        """
        return (
            self.env['account.account'].browse(self.env['ir.model.data'].search([
                ('name', '=', '%d_%s' % (company.id, xml_id)),
                ('model', '=', 'account.account'),
                ('module', 'like', 'l10n%')
            ], limit=1).res_id)
            or self.env['account.account'].search([
                ('user_type_id', '=', self.env.ref(user_type_id).id),
                ('company_id', '=', company.id)
            ], limit=1)
            or self.env['account.account'].search([('company_id', '=', company.id)], limit=1)
        )
