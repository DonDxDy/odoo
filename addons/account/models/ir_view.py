# -*- coding: utf-8 -*-

from odoo import fields, models, _
from odoo.tools.misc import DEFAULT_SERVER_DATETIME_FORMAT

from datetime import datetime


class IrView(models.Model):
    _inherit = 'ir.ui.view'

    def write(self, vals):
        for view in self:
            # warn the user (only if at least one invoice is posted)
            # this is triggered when changing the arch of the view (mail template) is edited
            company = self.env['res.company'].search([('external_report_layout_id', '=', view.id)], limit=1)
            if company and 'arch_base' in vals and 'install_filename' not in self._context:
                mail_template = self.env.ref('account.document_layout_changed_template')
                ctx = {
                    'user_name': self.env.user.name,
                    'company_name': company.name,
                    'timestamp': fields.Datetime.context_timestamp(self, datetime.now()).strftime(DEFAULT_SERVER_DATETIME_FORMAT),
                }
                mail_body = mail_template._render(ctx, engine='ir.qweb', minimal_qcontext=True)
                mail = self.env['mail.mail'].sudo().create({
                    'subject': _('Warning: document template of %s - %s has been modified', self._cr.dbname, company.name),
                    'email_to': self.env.user.email,
                    'email_from': self.env.ref('base.partner_root').email,
                    'auto_delete': True,
                    'body_html': mail_body,
                })
                mail.send()
        return super(IrView, self).write(vals)
