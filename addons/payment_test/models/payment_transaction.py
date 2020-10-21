# coding: utf-8
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging

from odoo import api, models, _
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)


class PaymentTransactionTest(models.Model):
    _inherit = 'payment.transaction'


    def _send_payment_request(self):
        """ Request our Imaginary acquirer to execute the payment.

        :return: None
        """
        super()._send_payment_request()  # Log the 'sent' message
        if self.acquirer_id.provider != 'test':
            return
        # The token payment test is always a success.
        self._set_done()
        self._execute_callback()



