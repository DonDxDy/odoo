# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api


class PackageType(models.Model):
    _name = 'stock.package.type'
    _description = "Stock package type"

    def _get_default_length_uom(self):
        return self.env['product.template']._get_length_uom_name_from_ir_config_parameter()

    def _get_default_weight_uom(self):
        return self.env['product.template']._get_weight_uom_name_from_ir_config_parameter()

    name = fields.Char('Package Type', required=True)
    sequence = fields.Integer('Sequence', default=1, help="The first in the sequence is the default one.")
    height = fields.Integer('Height', help="Packaging Height")
    width = fields.Integer('Width', help="Packaging Width")
    packaging_length = fields.Integer('Length', help="Packaging Length")
    max_weight = fields.Float('Max Weight', help='Maximum weight shippable in this packaging')
    shipper_package_code = fields.Char('Carrier Code')
    barcode = fields.Char('Barcode', copy=False)
    package_carrier_type = fields.Selection([('none', 'No carrier integration')], string='Carrier', default='none')
    weight_uom_name = fields.Char(string='Weight unit of measure label', compute='_compute_weight_uom_name', default=_get_default_weight_uom)
    length_uom_name = fields.Char(string='Length unit of measure label', compute='_compute_length_uom_name', default=_get_default_length_uom)
    company_id = fields.Many2one('res.company', 'Company', index=True)
    storage_category_capacity_ids = fields.One2many('stock.storage.category.capacity', 'package_type_id', 'Storage Category Capacity')

    _sql_constraints = [
        ('positive_height', 'CHECK(height>=0)', 'Height must be positive'),
        ('positive_width', 'CHECK(width>=0)', 'Width must be positive'),
        ('positive_length', 'CHECK(packaging_length>=0)', 'Length must be positive'),
        ('positive_max_weight', 'CHECK(max_weight>=0.0)', 'Max Weight must be positive'),
    ]

    @api.onchange('package_carrier_type')
    def _onchange_carrier_type(self):
        carrier_id = self.env['delivery.carrier'].search([('delivery_type', '=', self.package_carrier_type)], limit=1)
        if carrier_id:
            self.shipper_package_code = carrier_id._get_default_custom_package_code()
        else:
            self.shipper_package_code = False


    def _compute_length_uom_name(self):
        for packaging in self:
            packaging.length_uom_name = self.env['product.template']._get_length_uom_name_from_ir_config_parameter()

    def _compute_weight_uom_name(self):
        for packaging in self:
            packaging.weight_uom_name = self.env['product.template']._get_weight_uom_name_from_ir_config_parameter()
