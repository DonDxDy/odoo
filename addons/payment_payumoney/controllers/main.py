# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging
import pprint
import werkzeug

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


class PayuMoneyController(http.Controller):
    _success_url = '/payment/payumoney/success'
    _failure_url = '/payment/payumoney/failure'

    @http.route([_success_url, _failure_url], type='http', auth='public', csrf=False)
    def payu_return(self, **post):
        """ PayUmoney."""
        _logger.info('PayUmoney: entering handle_feedback_data with post data %s', pprint.pformat(post))
        if post:
            request.env['payment.transaction'].sudo()._handle_feedback_data('payumoney', post)
        return werkzeug.utils.redirect('/payment/status')
