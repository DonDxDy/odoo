# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import _, models
from odoo.exceptions import ValidationError


class AccountMove(models.Model):
    _inherit = 'account.move'

    def _get_payment_transaction_create_values(self):  # TODO ANV remove entirely ?
        """ Return the create values for a transaction linked to the current invoices.

        :return: The invoice-related create values for a `payment.transaction` record
        :rtype: dict
        :raise: ValidationError if the invoices values are inconsistent
        """
        # Ensure that the invoice currencies are the same
        currency = self[0].currency_id
        if any(invoice.currency_id != currency for invoice in self):
            raise ValidationError(
                _("A transaction cannot be linked to invoices having different currencies.")
            )

        # Ensure that the invoice partners are the same
        partner = self[0].partner_id
        if len(self.partner_id) != 1:
            raise ValidationError(
                _("A transaction cannot be linked to invoices having different partners.")
            )

        return {
            'amount': sum(self.mapped('amount_residual')),
            'currency_id': currency.id,
            'partner_id': partner.id,
            'invoice_ids': [(6, 0, self.ids)],
        }
