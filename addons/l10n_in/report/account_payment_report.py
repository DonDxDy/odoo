# -*- coding:utf-8 -*-
#az Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, tools


class L10nInPaymentReport(models.AbstractModel):
    _name = "l10n_in.payment.report"
    _description = "Indian accounting payment report"

    account_move_id = fields.Many2one('account.move', string="Account Move")
    payment_id = fields.Many2one('account.payment', string='Payment')
    currency_id = fields.Many2one('res.currency', string="Currency")
    amount = fields.Float(string="Amount")
    payment_amount = fields.Float(string="Payment Amount")
    partner_id = fields.Many2one('res.partner', string="Customer")
    gstin_partner_id = fields.Many2one('res.partner', string="GSTIN")
    payment_type = fields.Selection([('outbound', 'Send Money'), ('inbound', 'Receive Money')], string='Payment Type')
    journal_id = fields.Many2one('account.journal', string="Journal")
    company_id = fields.Many2one(related="journal_id.company_id", string="Company")
    l10n_in_place_of_supply = fields.Many2one('res.country.state', string="Partner State")
    place_of_supply = fields.Char(string="Place of Supply")
    supply_type = fields.Char(string="Supply Type")

    l10n_in_tax_id = fields.Many2one('account.tax', string="Tax")
    tax_rate_tag = fields.Char(string="Rate")
    igst_amount = fields.Float(compute="_compute_tax_amount", string="IGST amount")
    cgst_amount = fields.Float(compute="_compute_tax_amount", string="CGST amount")
    sgst_amount = fields.Float(compute="_compute_tax_amount", string="SGST amount")
    cess_amount = fields.Float(compute="_compute_tax_amount", string="CESS amount")
    gross_amount = fields.Float(compute="_compute_tax_amount", string="Gross advance")

    def _compute_l10n_in_tax(self, taxes, price_unit, currency=None, quantity=1.0, product=None, partner=None):
        """common method to compute gst tax amount base on tax group"""
        res = {'igst_amount': 0.0, 'sgst_amount': 0.0, 'cgst_amount': 0.0, 'cess_amount': 0.0}
        AccountTax = self.env['account.tax']
        igst_group = self.env.ref('l10n_in.igst_group', False)
        cgst_group = self.env.ref('l10n_in.cgst_group', False)
        sgst_group = self.env.ref('l10n_in.sgst_group', False)
        cess_group = self.env.ref('l10n_in.cess_group', False)
        filter_tax = taxes.filtered(lambda t: t.type_tax_use != 'none')
        tax_compute = filter_tax.compute_all(price_unit, currency=currency, quantity=quantity, product=product, partner=partner)
        for tax_data in tax_compute['taxes']:
            tax_group = AccountTax.browse(tax_data['id']).tax_group_id
            if tax_group == sgst_group:
                res['sgst_amount'] += tax_data['amount']
            elif tax_group == cgst_group:
                res['cgst_amount'] += tax_data['amount']
            elif tax_group == igst_group:
                res['igst_amount'] += tax_data['amount']
            elif tax_group == cess_group:
                res['cess_amount'] += tax_data['amount']
        res.update(tax_compute)
        return res

    #TO BE OVERWRITTEN
    @api.depends('currency_id')
    def _compute_tax_amount(self):
        """Calculate tax amount base on default tax set in company"""

    def _select(self):
        return """SELECT aml.id AS id,
            aml.move_id as account_move_id,
            ap.id AS payment_id,
            ap.l10n_in_gstin_partner_id AS gstin_partner_id,
            ap.payment_type,
            tax.id as l10n_in_tax_id,
            tt.name AS tax_rate_tag,
            am.partner_id,
            am.amount AS payment_amount,
            ap.journal_id,
            aml.currency_id,
            am.l10n_in_place_of_supply,
            (CASE WHEN pos.l10n_in_tin IS NOT NULL
                THEN concat(pos.l10n_in_tin,'-',pos.name)
                ELSE ''
                END) AS place_of_supply,
            (CASE WHEN pos.id = gstin_ps.id
                THEN 'Intra State'
                WHEN pos.id != gstin_ps.id
                THEN 'Inter State'
                END) AS supply_type"""

    def _from(self):
        return """FROM account_move_line aml
            JOIN account_move am ON am.id = aml.move_id
            JOIN account_payment ap ON ap.id = aml.payment_id
            JOIN account_account AS ac ON ac.id = aml.account_id
            JOIN account_journal AS aj ON aj.id = am.journal_id
            JOIN res_company AS c ON c.id = aj.company_id
            JOIN account_tax AS tax ON tax.id = (
                CASE WHEN ap.payment_type = 'inbound'
                    THEN c.account_sale_tax_id
                    ELSE c.account_purchase_tax_id END)
            JOIN account_tax_account_tag ttr ON ttr.account_tax_id = tax.id
            JOIN account_account_tag tt ON tt.id = ttr.account_account_tag_id
            JOIN res_partner p ON p.id = aml.partner_id
            LEFT JOIN res_country_state pos ON pos.id = am.l10n_in_place_of_supply
            LEFT JOIN res_partner gstin_p ON gstin_p.id = ap.l10n_in_gstin_partner_id
            LEFT JOIN res_country_state gstin_ps ON gstin_ps.id = gstin_p.state_id
            """

    def _where(self):
        return """WHERE aml.payment_id IS NOT NULL AND tt.l10n_in_use_in_report = True
            AND ac.internal_type IN ('receivable', 'payable') AND am.state = 'posted'"""

    @api.model_cr
    def init(self):
        tools.drop_view_if_exists(self.env.cr, self._table)
        self.env.cr.execute("""CREATE or REPLACE VIEW %s AS (
            %s %s %s)""" % (self._table, self._select(), self._from(), self._where()))


class AdvancesPaymentReport(models.Model):
    _name = "l10n_in.advances.payment.report"
    _inherit = 'l10n_in.payment.report'
    _description = "Advances Payment Analysis"
    _auto = False

    date = fields.Date(string="Payment Date")
    reconcile_amount = fields.Float(string="Reconcile amount in Payment month")

    @api.depends('payment_amount', 'reconcile_amount', 'currency_id')
    def _compute_tax_amount(self):
        """Calculate tax amount base on default tax set in company"""
        account_move_line = self.env['account.move.line']
        for record in self:
            base_amount = record.payment_amount - record.reconcile_amount
            taxes_data = self._compute_l10n_in_tax(
                taxes=record.l10n_in_tax_id,
                price_unit=base_amount,
                currency=record.currency_id or None,
                quantity=1,
                partner=record.partner_id or None)
            record.igst_amount = taxes_data['igst_amount']
            record.cgst_amount = taxes_data['cgst_amount']
            record.sgst_amount = taxes_data['sgst_amount']
            record.cess_amount = taxes_data['cess_amount']
            record.gross_amount = taxes_data['total_excluded']

    def _select(self):
        select_str = super(AdvancesPaymentReport, self)._select()
        select_str += """,
            ap.payment_date as date,
            (SELECT sum(amount) FROM account_partial_reconcile AS apr
                WHERE (apr.credit_move_id = aml.id OR apr.debit_move_id = aml.id)
                AND (to_char(apr.max_date, 'MM-YYYY') = to_char(aml.date_maturity, 'MM-YYYY'))
            ) AS reconcile_amount,
            (am.amount - (SELECT (CASE WHEN SUM(amount) IS NULL THEN 0 ELSE SUM(amount) END) FROM account_partial_reconcile AS apr
                WHERE (apr.credit_move_id = aml.id OR apr.debit_move_id = aml.id)
                AND (to_char(apr.max_date, 'MM-YYYY') = to_char(aml.date_maturity, 'MM-YYYY'))
            )) AS amount"""
        return select_str


class L10nInAdvancesPaymentAdjustmentReport(models.Model):
    _name = "l10n_in.advances.payment.adjustment.report"
    _inherit = 'l10n_in.payment.report'
    _description = "Advances Payment Adjustment Analysis"
    _auto = False

    date = fields.Date('Reconcile Date')

    @api.depends('amount', 'currency_id', 'partner_id')
    def _compute_tax_amount(self):
        account_move_line = self.env['account.move.line']
        for record in self:
            taxes_data = self._compute_l10n_in_tax(
                taxes=record.l10n_in_tax_id,
                price_unit=record.amount,
                currency=record.currency_id or None,
                quantity=1,
                partner=record.partner_id or None)
            record.igst_amount = taxes_data['igst_amount']
            record.cgst_amount = taxes_data['cgst_amount']
            record.sgst_amount = taxes_data['sgst_amount']
            record.cess_amount = taxes_data['cess_amount']
            record.gross_amount = taxes_data['total_excluded']

    def _select(self):
        select_str = super(L10nInAdvancesPaymentAdjustmentReport, self)._select()
        select_str += """,
            apr.max_date AS date,
            apr.amount AS amount
            """
        return select_str

    def _from(self):
        from_str = super(L10nInAdvancesPaymentAdjustmentReport, self)._from()
        from_str += """
            JOIN account_partial_reconcile apr ON apr.credit_move_id = aml.id OR apr.debit_move_id = aml.id
            """
        return from_str

    def _where(self):
        where_str = super(L10nInAdvancesPaymentAdjustmentReport, self)._where()
        where_str += """
            AND (to_char(apr.max_date, 'MM-YYYY') > to_char(aml.date_maturity, 'MM-YYYY'))
        """
        return where_str
