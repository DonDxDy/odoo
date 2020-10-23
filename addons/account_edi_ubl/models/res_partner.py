# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api

COUNTRY_EAS = {
    'HU': 9910,

    'AD': 9922,
    'AL': 9923,
    'BA': 9924,
    'BE': 9925,
    'BG': 9926,
    'CH': 9927,
    'CY': 9928,
    'CZ': 9929,
    'DE': 9930,
    'EE': 9931,
    'UK': 9932,
    'GR': 9933,
    'HR': 9934,
    'IE': 9935,
    'LI': 9936,
    'LT': 9937,
    'LU': 9938,
    'LV': 9939,
    'MC': 9940,
    'ME': 9941,
    'MK': 9942,
    'MT': 9943,
    'NL': 9944,
    'PL': 9945,
    'PT': 9946,
    'RO': 9947,
    'RS': 9948,
    'SI': 9949,
    'SK': 9950,
    'SM': 9951,
    'TR': 9952,
    'VA': 9953,

    'SE': 9955,

    'FR': 9957
}


class Partner(models.Model):
    _inherit = 'res.partner'

    en_16931_endpoint = fields.Char(compute='_compute_en_16931_endpoint', help='The ID of this partner in the EN16931 standard, related to the scheme used. Typically the vat number.')
    en_16931_endpoint_scheme = fields.Char(compute='_compute_en_16931_endpoint', help='The scheme used to identify this partner in the EN16931 standard. Typically, the national vat system.')

    @api.depends('vat', 'parent_id', 'parent_id.vat')
    def _compute_en_16931_endpoint(self):
        for partner in self:
            company = partner.parent_id or partner
            if company.country_id.code in COUNTRY_EAS:
                partner.en_16931_endpoint = company.vat
                partner.en_16931_endpoint_scheme = COUNTRY_EAS[company.country_id.code]
            else:
                partner.en_16931_endpoint = None
                partner.en_16931_endpoint_scheme = None
