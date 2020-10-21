# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging
import pprint
from random import randint

from odoo import http, _
from odoo.http import request
from odoo.addons.payment.utils import build_token_name

_logger = logging.getLogger(__name__)


class PaymentTestController(http.Controller):

    @http.route('/payment/test/payments', type='json', auth='public')
    def process_payment(
            self, reference, cc_number, cc_cvc, cc_name, cc_expiry):
        """ Simulate the result of a payment request and handle the response.
        :param str reference: The reference of the transaction
        :param int cc_number: The credit card number
        :param int cc_cvc: The credit card cvc
        :param int cc_name: the credit card owner
        :param int cc_expiry: The expiracy date
        :param int save_token: save token or not
        # :return: The JSON-formatted content of the response
        :rtype: dict
        """
        # In the future, we could generate fail or uncertain payment by using the form values
        fake_api_response = {
                'status': 'success',
                '3d_secure': False,
                'verified': True,
                'acquirer_reference': randint(1, 10000),
                'cc_number': build_token_name(payment_details_short=cc_number[-4:]),
                'cc_cvc': 'XXX',
                'cc_expiry': cc_expiry,
                'cc_holder_name': cc_name
        }
        # Handle the payment
        tx_sudo = request.env['payment.transaction'].sudo().search([('reference', '=', reference)])
        values = {{'acquirer_reference': fake_api_response.get('acquirer_reference')}}
        # Create the token with the data of the payment method
        if tx_sudo.tokenize:
            token_vals = {
                'name': "TEST %s %s" % (fake_api_response.get('cc_number'), fake_api_response['cc_holder_name']),
                'partner_id': tx_sudo.partner_id.id,
                'acquirer_id': tx_sudo.acquirer_id.id,
                'acquirer_ref': fake_api_response.get('acquirer_reference'),
                'verified': True,  # The payment is authorized, so the payment method is valid
            }
            token = request.env['payment.token'].create(token_vals)
            values.update({'token_id': token})
        tx_sudo.write(values)
        tx_sudo._set_done()
        tx_sudo._execute_callback()
        return {}
