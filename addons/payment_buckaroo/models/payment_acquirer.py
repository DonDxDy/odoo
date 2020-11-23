# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from hashlib import sha1
from werkzeug import urls

from odoo import fields, models


class AcquirerBuckaroo(models.Model):
    _inherit = 'payment.acquirer'

    provider = fields.Selection(
        selection_add=[('buckaroo', "Buckaroo")], ondelete={'buckaroo': 'set default'})
    brq_websitekey = fields.Char(string="WebsiteKey", required_if_provider='buckaroo', groups='base.group_system')
    brq_secretkey = fields.Char(string="SecretKey", required_if_provider='buckaroo', groups='base.group_system')

    def _get_buckaroo_urls(self):
        """ Buckaroo URLs
        """
        self.ensure_one()
        if self.state == 'enabled':
            return 'https://checkout.buckaroo.nl/html/'
        else:
            return 'https://testcheckout.buckaroo.nl/html/'

    def _buckaroo_generate_digital_sign(self, inout, values):
        """ Generate the shasign for incoming or outgoing communications.

        :param browse acquirer: the payment.acquirer browse record. It should
                                have a shakey in shaky out
        :param string inout: 'in' (odoo contacting buckaroo) or 'out' (buckaroo
                             contacting odoo).
        :param dict values: transaction values

        :return string: shasign
        """
        assert inout in ('in', 'out')
        assert self.provider == 'buckaroo'

        keys = "add_returndata Brq_amount Brq_culture Brq_currency Brq_invoicenumber Brq_return Brq_returncancel Brq_returnerror Brq_returnreject brq_test Brq_websitekey".split()

        def get_value(key):
            if values.get(key):
                return values[key]
            return ''

        values = dict(values or {})

        if inout == 'out':
            for key in list(values):
                # case insensitive keys
                if key.upper() == 'BRQ_SIGNATURE':
                    del values[key]
                    break

            items = sorted(values.items(), key=lambda pair: pair[0].lower())
            sign = ''.join('%s=%s' % (k, urls.url_unquote_plus(v)) for k, v in items)
        else:
            sign = ''.join('%s=%s' % (k, get_value(k)) for k in keys)
        # Add the pre-shared secret key at the end of the signature
        sign = sign + self.brq_secretkey
        shasign = sha1(sign.encode('utf-8')).hexdigest()
        return shasign
