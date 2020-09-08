# -*- coding: utf-8 -*-

from odoo import api, fields, models, _
from odoo.tools.misc import get_lang


class ApplicantGetRefuseReason(models.TransientModel):
    _name = 'applicant.get.refuse.reason'
    _inherits = {'mail.compose.message': 'composer_id'}
    _description = 'Get Refuse Reason'

    @api.model
    def default_get(self, fields):
        res = super(ApplicantGetRefuseReason, self).default_get(fields)
        res_ids = self._context.get('default_applicant_ids')

        composer = self.env['mail.compose.message'].create({
            'composition_mode': 'comment' if len(res_ids) == 1 else 'mass_mail',
        })
        if len(res_ids) == 1:
            # from form view fill the default partner on composer
            email = self.env['hr.applicant'].browse(res_ids).email_from
            partner = self.env['res.partner']
            parsed_name, parsed_email = partner._parse_partner_name(email)
            if parsed_email:
                res['partner_ids'] = partner.find_or_create(email)
        res.update({
            'applicant_ids': res_ids,
            'composer_id': composer.id,
        })
        return res

    refuse_reason_id = fields.Many2one('hr.applicant.refuse.reason', 'Refuse Reason')
    applicant_ids = fields.Many2many('hr.applicant')
    applicant_without_email = fields.Text(compute="_compute_applicant_without_email", string='applicant(s) not having email')
    composer_id = fields.Many2one('mail.compose.message', string='Composer', required=True, ondelete='cascade')
    template_id = fields.Many2one('mail.template', "Email Templates", index=True, domain="[('model', '=', 'hr.applicant')]")

    @api.depends('applicant_ids')
    def _compute_applicant_without_email(self):
        for wizard in self:
            applicants = self.env['hr.applicant'].search([
                ('id', 'in', wizard.applicant_ids.ids),
                '|', ('email_from', '=', False), ('partner_id.email', '=', False)
            ])
            if applicants:
                wizard.applicant_without_email = "%s\n%s" % (
                    _("The email will not be sent to following applicant(s) as they don't have email address."),
                    "\n".join([i.partner_name for i in applicants])
                )
            else:
                wizard.applicant_without_email = False

    @api.onchange('applicant_ids')
    def _compute_composition_mode(self):
        for wizard in self:
            wizard.composer_id.composition_mode = 'comment' if len(wizard.applicant_ids) == 1 else 'mass_mail'

    @api.onchange('template_id')
    def onchange_template_id(self):
        for wizard in self.filtered(lambda x: x.composer_id):
            wizard.composer_id.template_id = wizard.template_id.id
            wizard._compute_composition_mode()
            wizard.composer_id.onchange_template_id_wrapper()

    @api.onchange('refuse_reason_id')
    def onchange_refuse_reason_id(self):
        res_ids = self._context.get('default_applicant_ids')
        for wizard in self.filtered(lambda x: x.refuse_reason_id):
            if not wizard.composer_id:
                wizard.composer_id = self.env['mail.compose.message'].create({
                    'composition_mode': 'comment' if len(res_ids) == 1 else 'mass_mail',
                    'template_id': wizard.refuse_reason_id.template_id.id
                })
            wizard.template_id = wizard.composer_id.template_id = wizard.refuse_reason_id.template_id
            wizard.composer_id.onchange_template_id_wrapper()

    def action_refuse_reason_apply(self):
        return self.applicant_ids.write({'refuse_reason_id': self.refuse_reason_id.id, 'active': False})

    def _send_email(self, applicant_ids=False, lang=False):
        self_lang = self
        if applicant_ids and lang:
            self_lang = self.with_context(active_ids=applicant_ids, lang=lang)
            self_lang.onchange_template_id()
        self_lang.composer_id.send_mail()
        self_lang.applicant_ids.write({'refuse_reason_id': self.refuse_reason_id.id})

    def action_send_mail(self):
        self.ensure_one()
        if self.composition_mode == 'mass_mail' and self.template_id:
            active_records = self.applicant_ids.filtered(lambda x: x.partner_id.email or x.email_from)
            langs = active_records.mapped('partner_id.lang')
            default_lang = get_lang(self.env)
            for lang in (set(langs) or [default_lang]):
                active_ids_lang = active_records.filtered(lambda r: r.partner_id.lang == lang).ids
                if active_ids_lang:
                    self._send_email(applicant_ids=active_ids_lang, lang=lang)
            # applicant without partner but have email_from then send mail.
            active_ids_without_lang = active_records.filtered(lambda x: not x.partner_id and x.email_from).ids
            if active_ids_without_lang:
                self._send_email(applicant_ids=active_ids_without_lang, lang=default_lang.code)
        else:
            self._send_email()
        return {'type': 'ir.actions.act_window_close'}
