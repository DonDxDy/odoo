# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _

from odoo.addons import decimal_precision as dp
from odoo.exceptions import UserError
from odoo.tools.float_utils import float_round, float_compare


class PackOperation(models.Model):
    _name = "stock.pack.operation" #TODO: change to stock.move.operation
    _description = "Packing Operation"
    _order = "result_package_id desc, id"

    picking_id = fields.Many2one(
        'stock.picking', 'Stock Picking',
        help='The stock operation where the packing has been made')
    move_id = fields.Many2one(
        'stock.move', 'Stock Move', 
        help="Change to a better name") 
    product_id = fields.Many2one('product.product', 'Product', ondelete="cascade") #might be a related with the move also --> no, because you can put them next to each other
    product_uom_id = fields.Many2one('product.uom', 'Unit of Measure')
    product_qty = fields.Float('To Do', default=0.0, digits=dp.get_precision('Product Unit of Measure'), required=True)
    product_reserved_qty = fields.Float('Reserved', default=0.0, digits=dp.get_precision('Product Unit of Measure'), readonly=True)
    ordered_qty = fields.Float('Ordered Quantity', digits=dp.get_precision('Product Unit of Measure'))
    qty_done = fields.Float('Done', default=0.0, digits=dp.get_precision('Product Unit of Measure'), copy=False)
    is_done = fields.Boolean(compute='_compute_is_done', string='Done', readonly=False, oldname='processed_boolean')
    package_id = fields.Many2one('stock.quant.package', 'Source Package')
    lot_id = fields.Many2one('stock.production.lot', 'Lot')
    lot_name = fields.Char('Lot/Serial Number')
    result_package_id = fields.Many2one(
        'stock.quant.package', 'Destination Package',
        ondelete='cascade', required=False,
        help="If set, the operations are packed into this package")
    date = fields.Datetime('Date', default=fields.Date.context_today, required=True)
    owner_id = fields.Many2one('res.partner', 'Owner', help="Owner of the quants")
    location_id = fields.Many2one('stock.location', 'Source Location', required=True)
    location_dest_id = fields.Many2one('stock.location', 'Destination Location', required=True)
    picking_source_location_id = fields.Many2one('stock.location', related='picking_id.location_id')
    picking_destination_location_id = fields.Many2one('stock.location', related='picking_id.location_dest_id')
    from_loc = fields.Char(compute='_compute_location_description', string='From')
    to_loc = fields.Char(compute='_compute_location_description', string='To')
    fresh_record = fields.Boolean('Newly created pack operation', default=True)
    lots_visible = fields.Boolean(compute='_compute_lots_visible')
    state = fields.Selection(selection=[
        ('draft', 'Draft'),
        ('cancel', 'Cancelled'),
        ('waiting', 'Waiting Another Operation'),
        ('confirmed', 'Waiting Availability'),
        ('partially_available', 'Partially Available'),
        ('assigned', 'Available'),
        ('done', 'Done')], related='picking_id.state')
    part_of_pack = fields.Boolean('Is part of pack', default=False)
    first_pack = fields.Boolean('Is first of pack', default=False)
    first_product = fields.Boolean('Is first of product', default=True)

    @api.one
    def _compute_is_done(self):
        self.is_done = self.qty_done > 0.0

    @api.onchange('is_done')
    def on_change_is_done(self):
        if not self.product_id:
            if self.is_done and self.qty_done == 0:
                self.qty_done = 1.0
            if not self.is_done and self.qty_done != 0:
                self.qty_done = 0.0

    @api.one
    def _compute_location_description(self):
        self.from_loc = '%s%s' % (self.location_id.name, self.product_id and self.package_id.name or '')
        self.to_loc = '%s%s' % (self.location_dest_id.name, self.result_package_id.name or '')

    @api.one
    @api.depends('picking_id.picking_type_id', 'product_id.tracking')
    def _compute_lots_visible(self):
        picking = self.picking_id
        if picking.picking_type_id and self.product_id.tracking != 'none':  # TDE FIXME: not sure correctly migrated
            self.lots_visible = picking.picking_type_id.use_existing_lots or picking.picking_type_id.use_create_lots
        else:
            self.lots_visible = self.product_id.tracking != 'none'

    @api.multi
    @api.onchange('product_id', 'product_uom_id')
    def onchange_product_id(self):
        if self.product_id:
            self.lots_visible = self.product_id.tracking != 'none'
            if not self.product_uom_id or self.product_uom_id.category_id != self.product_id.uom_id.category_id:
                self.product_uom_id = self.product_id.uom_id.id
            res = {'domain': {'product_uom_id': [('category_id', '=', self.product_uom_id.category_id.id)]}}
        else:
            res = {'domain': {'product_uom_id': []}}
        return res

    @api.model
    def create(self, vals):
        vals['ordered_qty'] = vals.get('product_qty')
        return super(PackOperation, self).create(vals)

    @api.multi
    def write(self, values):
        # TDE FIXME: weird stuff, protectin pack op ?
        values['fresh_record'] = False
        return super(PackOperation, self).write(values)

    @api.multi
    def unlink(self):
        for pack_operation in self:
            if pack_operation.state in ('done', 'cancel'):
                raise UserError(_('You can not delete pack operations of a done picking'))
            # Unlinking a pack operation should unreserve.
            if pack_operation.product_reserved_qty:
                self.env['stock.quant'].decrease_reserved_quantity(
                    pack_operation.product_id,
                    pack_operation.location_id,
                    pack_operation.product_reserved_qty,
                    lot_id=pack_operation.lot_id,
                    package_id=pack_operation.package_id,
                    owner_id=pack_operation.owner_id,
                )
        return super(PackOperation, self).unlink()

    @api.multi
    def split_quantities(self):
        for operation in self:
            if float_compare(operation.product_qty, operation.qty_done, precision_rounding=operation.product_uom_id.rounding) == 1:
                cpy = operation.copy(default={'qty_done': 0.0, 'product_qty': operation.product_qty - operation.qty_done})
                operation.write({'product_qty': operation.qty_done})
                operation._copy_remaining_pack_lot_ids(cpy)
            else:
                raise UserError(_('The quantity to split should be smaller than the quantity To Do.  '))
        return True

    @api.multi
    def save(self):
        # TDE FIXME: does not seem to be used -> actually, it does
        # TDE FIXME: move me somewhere else, because the return indicated a wizard, in pack op, it is quite strange
        # HINT: 4. How to manage lots of identical products?
        # Create a picking and click on the Mark as TODO button to display the Lot Split icon. A window will pop-up. Click on Add an item and fill in the serial numbers and click on save button
        for pack in self:
            if pack.product_id.tracking != 'none':
                pack.write({'qty_done': sum(pack.pack_lot_ids.mapped('qty'))})
        return {'type': 'ir.actions.act_window_close'}

    @api.multi
    def show_details(self):
        # TDE FIXME: does not seem to be used
        view_id = self.env.ref('stock.view_pack_operation_details_form_save').id
        return {
            'name': _('Operation Details'),
            'type': 'ir.actions.act_window',
            'view_type': 'form',
            'view_mode': 'form',
            'res_model': 'stock.pack.operation',
            'views': [(view_id, 'form')],
            'view_id': view_id,
            'target': 'new',
            'res_id': self.ids[0],
            'context': self.env.context}