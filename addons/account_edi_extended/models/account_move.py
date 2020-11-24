# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, models


class AccountMove(models.Model):
    _inherit = 'account.move'

    @api.depends('edi_document_ids.error', 'edi_document_ids.blocked_level')
    def _compute_edi_error_count(self):
        # OVERRIDE to take blocked_level into account
        for move in self:
            errors = move.edi_document_ids.filtered(lambda d: d.error and d.blocked_level == 'error')
            move.edi_error_count = len(errors)

    @api.depends(
        'edi_document_ids',
        'edi_document_ids.state',
        'edi_document_ids.blocked_level',
        'edi_document_ids.edi_format_id',
        'edi_document_ids.edi_format_id.name')
    def _compute_edi_web_services_to_process(self):
        # OVERRIDE to take blocked_level into account
        for move in self:
            to_process = move.edi_document_ids.filtered(lambda d: d.state in ['to_send', 'to_cancel'] and d.blocked_level != 'error')
            format_web_services = to_process.edi_format_id.filtered(lambda f: f._needs_web_services())
            move.edi_web_services_to_process = ', '.join(f.name for f in format_web_services)

    def action_retry_edi_documents_error(self):
        self.edi_document_ids.write({'error': False, 'blocked_level': False})
        self.action_process_edi_web_services()
