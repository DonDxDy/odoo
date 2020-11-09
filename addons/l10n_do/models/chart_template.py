# coding: utf-8
# Copyright 2016 iterativo (https://www.iterativo.do) <info@iterativo.do>

from odoo import models, api, _


class AccountChartTemplate(models.Model):
    _inherit = 'account.chart.template'

    @api.model
    def _prepare_liquidity_journals(self, company, loaded_data):
        # OVERRIDE
        if company.country_id.code == 'DO':
            return [
                {
                    'type': 'cash',
                    'name': _('Cash'),
                    'company_id': company.id,
                },
                {
                    'type': 'cash',
                    'name': _('Caja Chica'),
                    'company_id': company.id,
                },
                {
                    'type': 'cash',
                    'name': _('Cheques Clientes'),
                    'company_id': company.id,
                },
                {
                    'type': 'bank',
                    'name': _('Bank'),
                    'company_id': company.id,
                },
            ]
        return super()._prepare_liquidity_journals(company, loaded_data)

    def _prepare_journals(self, company, loaded_data):
        # OVERRIDE
        journal_vals_list = super()._prepare_journals(company, loaded_data)
        if company.country_id.code == 'DO':
            for journal_vals in journal_vals_list:
                if journal_vals['code'] == 'FACT':
                    journal_vals['name'] = _('Compras Fiscales')
            journal_vals_list += [
                {
                    'type': 'purchase',
                    'name': _('Compras Informales'),
                    'code': 'CINF',
                    'company_id': company.id,
                    'show_on_dashboard': True,
                },
                {
                    'type': 'purchase',
                    'name': _('Gastos Menores'),
                    'code': 'GASM',
                    'company_id': company.id,
                    'show_on_dashboard': True,
                },
                {
                    'type': 'purchase',
                    'name': _('Compras al Exterior'),
                    'code': 'CEXT',
                    'company_id': company.id,
                    'show_on_dashboard': True,
                },
                {
                    'type': 'purchase',
                    'name': _('Gastos No Deducibles'),
                    'code': 'GASTO',
                    'company_id': company.id,
                    'show_on_dashboard': True,
                },
            ]
        return journal_vals_list
