# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.http import request

from odoo.addons.account.controllers import portal
from odoo.addons.portal.controllers.portal import _build_url_w_params


class PortalAccount(portal.PortalAccount):

    def _invoice_get_page_view_values(self, invoice, access_token, **kwargs):
        values = super()._invoice_get_page_view_values(invoice, access_token, **kwargs)
        logged_in = not request.env.user._is_public()
        # We set partner_id to the partner id of the current user if logged in, otherwise we set it
        # to the invoice partner id. We do this to ensure that payment tokens are assigned to the
        # correct partner and to avoid linking tokens to the public user.
        partner_id = request.env.user.partner_id.id if logged_in else invoice.partner_id.id
        acquirers_sudo = request.env['payment.acquirer'].sudo()._get_compatible_acquirers(
            invoice.company_id.id or request.env.company.id,
            partner_id,
            currency_id=invoice.currency_id.id,
        )  # In sudo mode to read the fields of acquirers and partner (if not logged in)
        tokens = request.env['payment.token'].search(
            [('acquirer_id', 'in', acquirers_sudo.ids), ('partner_id', '=', partner_id)]
        )  # Tokens are cleared at the end if the user is not logged in
        fees_by_acquirer = {
            acq_sudo: acq_sudo._compute_fees(
                invoice.amount_total, invoice.currency_id.id, invoice.company_id.country_id.id
            ) for acq_sudo in acquirers_sudo.filtered('fees_active')
        }
        values.update({
            'acquirers': acquirers_sudo,
            'tokens': tokens,
            'fees_by_acquirer': fees_by_acquirer,
            'show_tokenize_input': logged_in,  # Prevent public partner from saving payment methods
            'amount': invoice.amount_residual,
            'currency': invoice.currency_id,
            'partner_id': partner_id,
            'access_token': access_token,
            'init_tx_route': f'/invoice/transaction/{invoice.id}/',
            'landing_route': _build_url_w_params(invoice.access_url, {'access_token': access_token})
        })
        if not logged_in:  # TODO ANV check with TBE if managers should have access to customers' tokens
            # Don't display payment tokens of the invoice partner if the user is not logged but
            # inform that logging in will make them available.
            values.update({
                'existing_token': bool(tokens),
                'tokens': request.env['payment.token'],
            })
        return values
