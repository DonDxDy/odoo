# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import hashlib

from odoo import api, fields, models, _


class PaymentAcquirer(models.Model):
    _inherit = 'payment.acquirer'

    provider = fields.Selection(selection_add=[
        ('payumoney', 'PayUmoney')
    ], ondelete={'payumoney': 'set default'})
    payumoney_merchant_key = fields.Char(string='Merchant Key', required_if_provider='payumoney', groups='base.group_system')
    payumoney_merchant_salt = fields.Char(string='Merchant Salt', required_if_provider='payumoney', groups='base.group_system')

    def _payumoney_generate_sign(self, inout, values):
        """ Generate the shasign for incoming or outgoing communications.
        :param self: the self browse record. It should have a shakey in shakey out
        :param string inout: 'in' (odoo contacting payumoney) or 'out' (payumoney
                             contacting odoo).
        :param dict values: transaction values

        :return string: shasign
        """
        if inout not in ('in', 'out'):
            raise Exception("Type must be 'in' or 'out'")

        if inout == 'in':
            keys = "key|txnid|amount|productinfo|firstname|email|udf1|||||||||".split('|')
            sign = ''.join('%s|' % (values.get(k) or '') for k in keys)
            sign += self.payumoney_merchant_salt or ''
        else:
            keys = "|status||||||||||udf1|email|firstname|productinfo|amount|txnid".split('|')
            sign = ''.join('%s|' % (values.get(k) or '') for k in keys)
            sign = self.payumoney_merchant_salt + sign + self.payumoney_merchant_key

        shasign = hashlib.sha512(sign.encode('utf-8')).hexdigest()
        return shasign

    def _payumoney_get_redirect_url(self):
        self.ensure_one()
        if self.state == 'enabled':
            return 'https://secure.payu.in/_payment'
        return 'https://sandboxsecure.payu.in/_payment'

    @api.model
    def _get_compatible_acquirers(self, *args, currency_id=None, **kwargs):
        acquirers = super()._get_compatible_acquirers(*args, currency_id=currency_id, **kwargs)

        currency = self.env['res.currency'].browse(currency_id)
        if currency.name != 'INR':
            acquirers = acquirers.filtered(lambda a: a.provider != 'payumoney')

        return acquirers
