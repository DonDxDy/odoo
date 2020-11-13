# -*- coding: utf-8 -*-
import logging

from odoo import api, models

_logger = logging.getLogger(__name__)


class AccountChartTemplate(models.Model):
    _inherit = "account.chart.template"

    @api.model
    def _get_demo_data(self):
        ref = self.env.ref
        cid = self.env.company.id
        foreign = ref('l10n_cl.dc_fe_dte').id
        yield ('res.partner', [
            ('base.res_partner_12', {
                'l10n_cl_sii_taxpayer_type': '4',
            }),
            ('base.res_partner_2', {
                'l10n_cl_sii_taxpayer_type': '4',
            }),
        ])
        yield ('l10n_latam.document.type', [
            ('l10n_cl.dc_fe_dte', {'active': True}),
        ])
        for model, data in super()._get_demo_data():
            data_dict = dict(data)
            if model == 'account.move' and f'{cid}_demo_invoice_1' in data_dict:
                self.env['account.journal'].search([
                    ('type', '=', 'purchase'),
                    ('company_id', '=', self.env.company.id),
                ]).l10n_latam_use_documents = False
                data_dict[f'{cid}_demo_invoice_1']['l10n_latam_document_type_id'] = foreign
                data_dict[f'{cid}_demo_invoice_2']['l10n_latam_document_type_id'] = foreign
                data_dict[f'{cid}_demo_invoice_3']['l10n_latam_document_type_id'] = foreign
                data_dict[f'{cid}_demo_invoice_followup']['l10n_latam_document_type_id'] = foreign
            yield model, data
