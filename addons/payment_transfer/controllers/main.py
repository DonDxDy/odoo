# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import logging
import pprint

import werkzeug

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


class TransferController(http.Controller):
    _accept_url = '/payment/transfer/feedback'

    @http.route(_accept_url, type='http', auth='public', methods=['POST'], csrf=False)
    def transfer_form_feedback(self, **post):
        _logger.info('Beginning _handle_feedback_data with post data %s', pprint.pformat(post))
        request.env['payment.transaction'].sudo()._handle_feedback_data('transfer', post)
        return werkzeug.utils.redirect('/payment/status')
