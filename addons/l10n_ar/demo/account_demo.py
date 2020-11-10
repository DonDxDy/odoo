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
        yield ('res.partner', [
            ('base.res_partner_12', {
                'l10n_ar_afip_responsibility_type_id': ref('l10n_ar.res_IVARI').id,
            }),
            ('base.res_partner_2', {
                'l10n_ar_afip_responsibility_type_id': ref('l10n_ar.res_IVARI').id,
            }),
        ])
        for model, data in super()._get_demo_data():
            data_dict = dict(data)
            if model == 'account.move' and f'{cid}_demo_invoice_5' in data_dict:
                data_dict[f'{cid}_demo_invoice_5']['l10n_latam_document_number'] = '1-1'
                data_dict[f'{cid}_demo_invoice_equipment_purchase']['l10n_latam_document_number'] = '1-2'
            yield model, data
