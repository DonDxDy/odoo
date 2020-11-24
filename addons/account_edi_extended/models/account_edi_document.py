# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models, fields, _
import logging

_logger = logging.getLogger(__name__)
DEFAULT_BLOCKING_LEVEL = 'warning'  # Keep previous behavior. TODO : when account_edi_extended is merged with account_edi, should be 'error' (document will not be processed again until forced retry or reset to draft)


class AccountEdiDocument(models.Model):
    _inherit = 'account.edi.document'

    blocked_level = fields.Selection(selection=[('info', 'Info'), ('warning', 'Warning'), ('error', 'Error')])

    def _check_move_configuration(self):
        # OVERRIDE
        for document in self:
            errors = document.edi_format_id._check_move_configuration(document.move_id)
            if errors:
                # Errors are just informative at this point, _process_job will still be called on these documents
                document.error = self.env['account.edi.format']._format_error_message(_('Invalid configuration:'), errors)
                document.blocked_level = 'info'
