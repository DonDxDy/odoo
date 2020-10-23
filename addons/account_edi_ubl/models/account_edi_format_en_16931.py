# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, models, fields, _
from lxml import etree
import base64
from odoo.tools import float_repr
from odoo.tests.common import Form
from odoo.exceptions import UserError
from odoo.osv import expression


class AccountEdiFormat(models.Model):
    _inherit = 'account.edi.format'

    ####################################################
    # Hooks
    ####################################################

    def _is_en_16931(self, filename, tree):
        ''' Checks if the xml can be imported with this EN16931 implementation.
            Note that you need to override _create_invoice_from_xml_tree/_update_invoice_from_xml_tree or _import_ubl
            if you want to customize import, otherwise generic import will be used.

            TO OVERRIDE
        '''
        return False  # we must check self.code which does not exist here because we're in an abstract format.

    def _get_en_16931_values(self, invoice):
        self.ensure_one()

        def convert_monetary(amount, from_currency):
            # All monetary should be in the invoice currency, except for vat total
            return from_currency._convert(amount, invoice.currency_id, invoice.company_id, invoice.invoice_date)

        def get_tax_total():
            breakdown = {}
            for line in invoice.invoice_line_ids.filtered(lambda line: not line.display_type):
                if line.tax_ids:
                    price_unit_wo_discount = line.price_unit * (1 - (line.discount / 100.0))
                    line_taxes = line.tax_ids.compute_all(
                        price_unit_wo_discount,
                        quantity=line.quantity,
                        product=line.product_id,
                        partner=invoice.partner_id,
                        currency=line.currency_id,
                        is_refund=invoice.move_type in ('out_refund', 'in_refund'))['taxes']
                    for tax in line_taxes:
                        tax_category = 'S' if tax['amount'] else 'Z'
                        tax_percent = self.env['account.tax'].browse(tax['id']).amount
                        breakdown.setdefault((tax_category, tax_percent), {'base': 0, 'amount': 0})
                        breakdown[(tax_category, tax_percent)]['base'] += tax['base']
                        breakdown[(tax_category, tax_percent)]['amount'] += tax['amount']
                else:
                    breakdown.setdefault(('Z', 0), {'base': 0, 'amount': 0})
                    breakdown[('Z', 0)]['base'] += line.price_subtotal

            sign = -1 if invoice.move_type in ('out_refund', 'in_refund') else 1
            return {'amount': invoice.amount_tax,
                    'seller_currency': invoice.company_id.currency_id,
                    'amount_seller_currency': invoice.currency_id._convert(invoice.amount_tax_signed * sign, invoice.company_id.currency_id, invoice.company_id, invoice.date),
                    'breakdown': breakdown}

        values = self._get_ubl_values(invoice)
        values.update({
            'customization_id': 'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0',
            'profile_id': 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
            'due_date': fields.Date.to_string(invoice.invoice_date_due),
            'invoice_date': fields.Date.to_string(invoice.invoice_date),
            'tax_total': get_tax_total(),

            'convert_monetary': convert_monetary,
            'partner_template': 'account_edi_ubl.export_en_16931_invoice_partner',
        })
        return values

    ####################################################
    # Import
    ####################################################

    def _decode_en_16931(self, tree, invoice):

        namespaces = self._get_ubl_namespaces(tree)

        def _find_value(xpath, element=tree):
            return self._find_value(xpath, element, namespaces)

        elements = tree.xpath('//cbc:InvoiceTypeCode', namespaces=namespaces)
        if elements:
            type_code = elements[0].text
            move_type = 'in_refund' if type_code == '381' else 'in_invoice'
        else:
            move_type = 'in_invoice'

        default_journal = invoice.with_context(default_move_type=move_type)._get_default_journal()

        with Form(invoice.with_context(default_move_type=move_type, default_journal_id=default_journal.id)) as invoice_form:
            # Reference
            elements = tree.xpath('//cbc:ID', namespaces=namespaces)
            if elements:
                invoice_form.ref = elements[0].text

            # Dates
            elements = tree.xpath('//cbc:IssueDate', namespaces=namespaces)
            if elements:
                invoice_form.invoice_date = elements[0].text
            elements = tree.xpath('//cbc:DueDate', namespaces=namespaces)
            if elements:
                invoice_form.invoice_date_due = elements[0].text

            # Currency
            currency = self._retrieve_currency(_find_value('//cbc:DocumentCurrencyCode'))
            if currency:
                invoice_form.currency_id = currency

            # Partner
            invoice_form.partner_id = self._retrieve_partner(
                name=_find_value('//cac:AccountingSupplierParty/cac:Party//cbc:Name'),
                phone=_find_value('//cac:AccountingSupplierParty/cac:Party//cbc:Telephone'),
                mail=_find_value('//cac:AccountingSupplierParty/cac:Party//cbc:ElectronicMail'),
                vat=_find_value('//cac:AccountingSupplierParty/cac:Party//cac:PartyTaxScheme/cbc:CompanyID'),
            )

            # Lines
            lines_elements = tree.xpath('//cac:InvoiceLine', namespaces=namespaces)
            for eline in lines_elements:
                with invoice_form.invoice_line_ids.new() as invoice_line_form:
                    # Product
                    invoice_line_form.product_id = self._retrieve_product(
                        default_code=_find_value('cac:Item/cac:SellersItemIdentification/cbc:ID', eline),
                        name=_find_value('cac:Item/cbc:Name', eline),
                        ean13=_find_value('cac:Item/cac:StandardItemIdentification/cbc:ID[@schemeID=\'0160\']', eline)
                    )

                    # Quantity
                    elements = eline.xpath('cbc:InvoicedQuantity', namespaces=namespaces)
                    quantity = elements and float(elements[0].text) or 1.0
                    invoice_line_form.quantity = quantity

                    # Price Unit
                    elements = eline.xpath('cac:Price/cbc:PriceAmount', namespaces=namespaces)
                    price_unit = elements and float(elements[0].text) or 0.0
                    line_extension_amount = elements and float(elements[0].text) or 0.0
                    invoice_line_form.price_unit = price_unit or line_extension_amount / invoice_line_form.quantity or 0.0

                    # Name
                    elements = eline.xpath('cac:Item/cbc:Description', namespaces=namespaces)
                    invoice_line_form.name = elements and elements[0].text or ''

                    # Taxes
                    tax_element = eline.xpath('cac:Item/cac:ClassifiedTaxCategory', namespaces=namespaces)
                    invoice_line_form.tax_ids.clear()
                    for eline in tax_element:
                        invoice_line_form.tax_ids.add(self._retrieve_tax(
                            amount=_find_value('cbc:Percent', eline),
                            type_tax_use=invoice_form.journal_id.type
                        ))

        return invoice_form.save()

    ####################################################
    # Account.edi.format override
    ####################################################

    def _create_invoice_from_xml_tree(self, filename, tree):
        self.ensure_one()
        if self._is_en_16931(filename, tree):
            return self._decode_en_16931(tree, self.env['account.move'])
        return super()._create_invoice_from_xml_tree(filename, tree)

    def _update_invoice_from_xml_tree(self, filename, tree, invoice):
        self.ensure_one()
        if self._is_en_16931(filename, tree):
            return self._decode_en_16931(tree, invoice)
        return super()._update_invoice_from_xml_tree(filename, tree, invoice)
