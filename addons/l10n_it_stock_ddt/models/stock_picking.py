# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api, _


class StockPicking(models.Model):
    _inherit = "stock.picking"

    l10n_it_transport_reason = fields.Selection([('sale', 'Sale'), ('repair', 'Repair')], default="sale", string='Transport Reason')
    l10n_it_transport_method = fields.Selection([('sender', 'Sender'), ('recipient', 'Recipient'), ('courier', 'Courier service')], default="sender", string='Transport Method')
    l10n_it_transport_method_detail = fields.Char('Transport Method Details')
    l10n_it_parcels = fields.Integer(string="Parcels")
    l10n_it_country_code = fields.Char(related="company_id.country_id.code")
    l10n_it_ddt_number = fields.Char('DDT Number')

    def action_done(self):
        super(StockPicking, self).action_done()
        for picking in self.filtered(lambda p: p.picking_type_id.l10n_it_ddt_sequence_id):
            picking.l10n_it_ddt_number = picking.picking_type_id.l10n_it_ddt_sequence_id.next_by_id()


class StockPickingType(models.Model):
    _inherit = 'stock.picking.type'

    l10n_it_ddt_sequence_id = fields.Many2one('ir.sequence')

    @api.model
    def create(self, vals):
        if 'l10n_it_ddt_sequence_id' not in vals or not vals['l10n_it_ddt_sequence_id'] and vals['code'] == 'outgoing':
            if vals['warehouse_id']:
                wh = self.env['stock.warehouse'].browse(vals['warehouse_id'])
                vals['l10n_it_ddt_sequence_id'] = self.env['ir.sequence'].create({
                    'name': wh.name + ' ' + _('Sequence') + ' ' + vals['sequence_code'],
                    'prefix': wh.code + '/' + vals['sequence_code'] + '/DDT', 'padding': 5,
                    'company_id': wh.company_id.id,
                    'implementation': 'no_gap',
                }).id
            else:
                vals['l10n_it_ddt_sequence_id'] = self.env['ir.sequence'].create({
                    'name': _('Sequence') + ' ' + vals['sequence_code'],
                    'prefix': vals['sequence_code'], 'padding': 5,
                    'company_id': self.env.company.id,
                    'implementation': 'no_gap',
                }).id
        picking_type = super(StockPickingType, self).create(vals)
        return picking_type

    def write(self, vals):
        if 'sequence_code' in vals:
            for picking_type in self.filtered(lambda p: p.l10n_it_ddt_sequence_id):
                if picking_type.warehouse_id:
                    picking_type.l10n_it_ddt_sequence_id.write({
                        'name': picking_type.warehouse_id.name + ' ' + _('Sequence') + ' ' + vals['sequence_code'],
                        'prefix': picking_type.warehouse_id.code + '/' + vals['sequence_code'] + '/DDT', 'padding': 5,
                        'company_id': picking_type.warehouse_id.company_id.id,
                    })
                else:
                    picking_type.l10n_it_ddt_sequence_id.write({
                        'name': _('Sequence') + ' ' + vals['sequence_code'],
                        'prefix': vals['sequence_code'], 'padding': 5,
                        'company_id': picking_type.env.company.id,
                    })
        return super(StockPickingType, self).write(vals)