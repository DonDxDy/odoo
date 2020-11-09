# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models
from odoo.http import request


class AccountChartTemplate(models.Model):
    _inherit = 'account.chart.template'

    def _update_company_after_loading(self, company, loaded_data):
        # OVERRIDE
        # Set tax calculation rounding method required in Chilean localization.
        res = super()._update_company_after_loading(company, loaded_data)

        if company.country_id.code == 'CL':
            company.tax_calculation_rounding_method = 'round_globally'

        return res
