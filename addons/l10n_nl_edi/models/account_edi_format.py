# -*- coding: utf-8 -*-

from odoo import api, models, fields, _
from odoo.osv import expression
from odoo.tools import float_repr

import base64


class AccountEdiFormat(models.Model):
    _inherit = 'account.edi.format'

    ####################################################
    # Account.edi.format override
    ####################################################

    def _is_compatible_with_journal(self, journal):
        self.ensure_one()
        res = super()._is_compatible_with_journal(journal)
        if self.code != 'nlcius_1':
            return res
        return journal.type == 'sale' and journal.country_code == 'NL'

    def _post_invoice_edi(self, invoices, test_mode=False):
        self.ensure_one()
        if self.code != 'nlcius_1':
            return super()._post_invoice_edi(invoices, test_mode=test_mode)

        invoice = invoices  # no batch ensure that there is only one invoice
        errors = self._l10n_nl_edi_check_invoice_configuration(invoice)
        if errors:
            return {invoice: {'error': self._format_error_message(_("Invalid configuration:"), errors)}}
        attachment = self._export_nlcius(invoice)
        return {invoice: {'attachment': attachment}}

    @api.model
    def _format_error_message(self, error_title, errors):
        #TODO remove this as it is defined in l10n_co which is not yet merged
        bullet_list_msg = ''.join('<li>%s</li>' % msg for msg in errors)
        return '%s<ul>%s</ul>' % (error_title, bullet_list_msg)

    def _is_embedding_to_invoice_pdf_needed(self):
        self.ensure_one()
        if self.code != 'nlcius_1':
            return super()._is_embedding_to_invoice_pdf_needed()
        return False  # ubl must not be embedded to PDF.

    ####################################################
    # account_edi_ubl override
    ####################################################

    def _is_en_16931(self, filename, tree):
        if self.code != 'nlcius_1':
            return super()._is_ubl(filename, tree)
        customization_id = self._find_value("//*[local-name()='CustomizationID']", tree)
        return 'nlcius' in customization_id

    def _decode_en_16931(self, tree, invoice):
        res = super()._decode_en_16931(tree, invoice)

        if not res.partner_id:
            namespaces = self._get_ubl_namespaces(tree)
            endpoint = tree.xpath('//cac:AccountingSupplierParty/cac:Party//cbc:EndpointID', namespaces=namespaces)
            if endpoint:
                endpoint = endpoint[0]
                scheme = endpoint.attrib['schemeID']
                domains = []
                if scheme == '0106' and endpoint.text:
                    domains.append([('l10n_nl_kvk', '=', endpoint.text)])
                elif scheme == '0190' and endpoint.text:
                    domains.append([('l10n_nl_oin', '=', endpoint.text)])
                if domains:
                    partner = self.env['res.partner'].search(expression.OR(domains), limit=1)
                    if partner:
                        res.partner_id = partner
        return res

    def _get_en_16931_values(self, invoice):
        values = super()._get_en_16931_values(invoice)
        if self.code != 'nlcius_1':
            return values

        values['customization_id'] = 'urn:cen.eu:en16931:2017#compliant#urn:fdc:nen.nl:nlcius:v1.0'
        values['payment_means_code'] = 30
        values['partner_template'] = 'l10n_nl_edi.export_en_16931_invoice_partner'

        return values

    ####################################################
    # Export
    ####################################################

    def _l10n_nl_edi_check_invoice_configuration(self, invoice):
        errors = []

        supplier = invoice.company_id.partner_id.commercial_partner_id
        if not supplier.street or not supplier.zip or not supplier.city:
            errors.append(_("Supplier's address must include street, zip and city."))
        if not supplier.l10n_nl_kvk:
            errors.append(_("Supplier must have a KvK-nummer"))

        customer = invoice.commercial_partner_id
        if customer.country_code == 'NL' and (not customer.street or not customer.zip or not customer.city):
            errors.append(_("Customer's address must include street, zip and city."))
        if customer.country_code == 'NL' and not customer.l10n_nl_kvk and not customer.l10n_nl_oin:
            errors.append(_("Customer must have a KvK-nummer or OIN"))

        return errors

    def _export_nlcius(self, invoice):
        self.ensure_one()
        # Create file content.
        xml_content = b"<?xml version='1.0' encoding='UTF-8'?>"
        xml_content += self.env.ref('account_edi_ubl.export_en_16931_invoice')._render(self._get_en_16931_values(invoice))
        vat = invoice.company_id.partner_id.commercial_partner_id.vat
        xml_name = 'nlcius-%s%s%s.xml' % (vat or '', '-' if vat else '', invoice.name.replace('/', '_'))
        return self.env['ir.attachment'].create({
            'name': xml_name,
            'datas': base64.encodebytes(xml_content),
            'res_model': 'account.move',
            'res_id': invoice._origin.id,
            'mimetype': 'application/xml'
        })
