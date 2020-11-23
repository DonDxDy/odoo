# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging
import pprint
import werkzeug

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


class BuckarooController(http.Controller):
    _return_url = '/payment/buckaroo/return'
    _cancel_url = '/payment/buckaroo/cancel'
    _exception_url = '/payment/buckaroo/error'
    _reject_url = '/payment/buckaroo/reject'

    @http.route([
        '/payment/buckaroo/return',
        '/payment/buckaroo/cancel',
        '/payment/buckaroo/error',
        '/payment/buckaroo/reject',
    ], type='http', auth='public', csrf=False)
    def buckaroo_return_from_redirect(self, **data):
        """ Buckaroo."""
        _logger.info("Buckaroo: entering form_feedback with post data %s", pprint.pformat(data))  # debug
        request.env['payment.transaction'].sudo()._handle_feedback_data(provider='buckaroo', data=data)
        post = {key.upper(): value for key, value in data.items()}
        # TODO mba may be remove the return_url
        return_url = post.get('ADD_RETURNDATA') or '/'
        return werkzeug.utils.redirect('/payment/status')
