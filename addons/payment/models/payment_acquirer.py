# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging
import psycopg2

from odoo import _, api, fields, models, SUPERUSER_ID
from odoo.exceptions import ValidationError
from odoo.http import request
from odoo.osv import expression

_logger = logging.getLogger(__name__)


def create_missing_journals(cr, _registry):
    """ Post-init hook responsible for the creation of a journal for all acquirers missing one. """
    env = api.Environment(cr, SUPERUSER_ID, {})
    env['payment.acquirer']._create_missing_journals()


class PaymentAcquirer(models.Model):

    _name = 'payment.acquirer'
    _description = 'Payment Acquirer'
    _order = 'module_state, state, sequence, name'

    def _valid_field_parameter(self, field, name):
        return name == 'required_if_provider' or super()._valid_field_parameter(field, name)

    # Configuration fields
    name = fields.Char(string="Name", required=True, translate=True)
    provider = fields.Selection(
        string="Provider", help="The Payment Service Provider to use with this acquirer",
        selection=[('manual', "Custom Payment Form")], default='manual', required=True)
    state = fields.Selection(
        string="State",
        help="In test mode, a fake payment is processed through a test payment interface.\n"
             "This mode is advised when setting up the acquirer.\n"
             "Note: test and production modes require different credentials.",
        selection=[('disabled', "Disabled"), ('enabled', "Enabled"), ('test', "Test Mode")],
        default='disabled', required=True, copy=False)
    company_id = fields.Many2one(
        string="Company", comodel_name='res.company', default=lambda self: self.env.company.id,
        required=True)
    payment_icon_ids = fields.Many2many(
        string="Supported Payment Icons", comodel_name='payment.icon')
    allow_tokenization = fields.Boolean(
        string="Allow Saving Payment Methods",
        help="This controls whether customers can save their payment methods as payment tokens.\n"
             "A payment token is an anonymous link to the payment method details saved in the\n"
             "acquirer's database, allowing the customer to reuse it for a next purchase.")
    check_validity = fields.Boolean(
        string="Verify Token Validity",
        help="Whether a validation transaction should be triggered and immediately refunded\n"
             "to check the validity of newly created payment tokens. Without this check,\n"
             "the validity will only be verified at the very first transaction.")
    capture_manually = fields.Boolean(
        string="Capture Amount Manually",
        help="Capture the amount from Odoo, when the delivery is completed.\n"
             "Use this if you want to charge your customers cards only when\n"
             "you are sure you can ship the goods to them.")
    redirect_template_view_id = fields.Many2one(
        name="Redirect Form Template", comodel_name='ir.ui.view',
        help="The template rendered in the form when submitting a payment with redirection",
        domain=[('type', '=', 'qweb')])
    inline_template_view_id = fields.Many2one(
        string="Inline Form Template", comodel_name='ir.ui.view',
        help="The template rendered inside the acquirer form when making a direct payment",
        domain=[('type', '=', 'qweb')])
    country_ids = fields.Many2many(
        string="Countries", comodel_name='res.country', relation='payment_country_rel',
        column1='payment_id', column2='country_id',
        help="The countries for which this payment acquirer is available.\n"
             "If none is selected, it is available for all countries.")
    journal_id = fields.Many2one(
        string="Payment Journal", comodel_name='account.journal',
        help="The journal in which the successful transactions are posted",
        domain="[('type', 'in', ['bank', 'cash']), ('company_id', '=', company_id)]")
    inbound_payment_method_ids = fields.Many2many(
        related='journal_id.inbound_payment_method_ids', readonly=False)

    # Fees fields
    fees_active = fields.Boolean(string="Add Extra Fees")
    fees_dom_fixed = fields.Float(string="Fixed domestic fees")
    fees_dom_var = fields.Float(string="Variable domestic fees (in percents)")
    fees_int_fixed = fields.Float(string="Fixed international fees")
    fees_int_var = fields.Float(string="Variable international fees (in percents)")

    # Message fields
    display_as = fields.Char(
        string="Displayed as", help="Description of the acquirer for customers",
        translate=True)
    pre_msg = fields.Html(
        string="Help Message", help="The message displayed to explain and help the payment process",
        translate=True)
    auth_msg = fields.Html(
        string="Authorize Message", help="The message displayed if payment is authorized",
        default=lambda self: _("Your payment has been authorized."), translate=True)
    pending_msg = fields.Html(
        string="Pending Message",
        help="The message displayed if the order pending after the payment process",
        default=lambda self: _(
            "Your payment has been successfully processed but is waiting for approval."
        ), translate=True)
    done_msg = fields.Html(
        string="Done Message",
        help="The message displayed if the order is successfully done after the payment process",
        default=lambda self: _("Your payment has been successfully processed. Thank you!"),
        translate=True)
    cancel_msg = fields.Html(
        sring="Canceled Message",
        help="The message displayed if the order is canceled during the payment process",
        default=lambda self: _("Your payment has been cancelled."), translate=True)

    # Feature support fields
    support_authorization = fields.Boolean(
        string="Authorize Mechanism Supported", compute='_compute_supported_features', store=True)
    support_fees_computation = fields.Boolean(
        string="Fees Computation Supported", compute='_compute_supported_features', store=True)
    support_tokenization = fields.Boolean(
        string="Tokenization supported", compute='_compute_supported_features', store=True)

    # Fields used in kanban view
    sequence = fields.Integer(string="Sequence", help="Define the display order", default=10)
    description = fields.Html(
        string="Description", help="The description shown in the card in kanban view ")
    image_128 = fields.Image(string="Image", max_width=128, max_height=128)
    color = fields.Integer(
        string="Color", help="The color of the card in kanban view", compute='_compute_color',
        store=True)

    # Module-related fields
    module_id = fields.Many2one(
        string="Corresponding Module", comodel_name='ir.module.module')
    module_state = fields.Selection(
        string="Installation State", related='module_id.state', store=True)
    module_to_buy = fields.Boolean(
        string="Odoo Enterprise Module", related='module_id.to_buy', store=False)

    #=== COMPUTE METHODS ===#

    @api.onchange('state')
    def _onchange_state(self):
        """ Only enable dashboard display for journals of enabled acquirers.

        :return: None
        """
        for acquirer in self:
            acquirer.journal_id.show_on_dashboard = acquirer.state == 'enabled'

    @api.onchange('allow_tokenization')
    def _onchange_allow_tokenization(self):
        """ Add (remove) the electronic payment method for acquirers (not) allowing tokenization.

        :return: None
        """
        electronic = self.env.ref('payment.account_payment_method_electronic_in')
        for acquirer in self:
            if acquirer.allow_tokenization:
                if electronic not in acquirer.inbound_payment_method_ids:
                    acquirer.inbound_payment_method_ids = [(4, electronic.id)]
            elif electronic in acquirer.inbound_payment_method_ids:
                acquirer.inbound_payment_method_ids = [(2, electronic.id)]

    @api.depends('provider')
    def _compute_supported_features(self):
        """ Update the acquirer-specific fields as specified by their corresponding acquirer.

        :return: None
        """
        for acquirer in self:
            supported_features = self._get_supported_features(acquirer.provider)
            acquirer.support_authorization = supported_features.get('authorization', False)
            acquirer.support_fees_computation = supported_features.get('fees_computation', False)
            acquirer.support_tokenization = supported_features.get('tokenization', False)

    @api.model
    def _get_supported_features(self, _provider):
        """Get the specification of supported features.

        For an acquirer to specify that it supports one of the features, it must override this
        method and return a specification of which features it supports.

        List of features and their technical names:
            - authorization: support authorizing payment (separate authorization and capture)
            - fees_computation: support payment fees computation
            - tokenization: support saving payment data as a `payment.token` record

        :param string _provider: The provider of the acquirer
        :return: The supported features for this acquirer. To specify a feature as supported, the
                 dict must have an entry of the technical name of the feature as the key, and True
                 as the value.
        :rtype: dict
        """
        return {'authorization': False, 'fees_computation': False, 'tokenization': False}

    @api.depends('state', 'module_state')
    def _compute_color(self):  # TODO make colors constants
        """ Update the color of the kanban card based on the state of the acquirer.

        :return: None
        """
        for acquirer in self:
            if acquirer.module_id and not acquirer.module_state == 'installed':
                acquirer.color = 4  # blue
            elif acquirer.state == 'disabled':
                acquirer.color = 3  # yellow
            elif acquirer.state == 'test':
                acquirer.color = 2  # orange
            elif acquirer.state == 'enabled':
                acquirer.color = 7  # green

    #=== CRUD METHODS ===#

    @api.model_create_multi
    def create(self, values_list):
        acquirers = super().create(values_list)
        acquirers._check_required_if_provider()
        return acquirers

    def write(self, values):
        result = super().write(values)
        self._check_required_if_provider()
        return result

    def _check_required_if_provider(self):
        """ Check that acquirer-specific required fields have been filled.

        The fields that have the `required_if_provider="<provider>"` attribute are made required
        for all payment.acquirer records with the `provider` field equal to <provider> and with the
        `state` field equal to 'enabled' or 'test'.
        Acquirer-specific views should make the form fields required under the same conditions.

        :return: None
        :raise ValidationError: if an acquirer-specific required field is empty
        """
        field_names = []
        enabled_acquirers = self.filtered(lambda acq: acq.state in ['enabled', 'test'])
        for name, field in self._fields.items():
            required_provider = getattr(field, 'required_if_provider', None)
            if required_provider and any(
                required_provider == acquirer.provider and not acquirer[name]
                for acquirer in enabled_acquirers
            ):
                ir_field = self.env['ir.model.fields']._get(self._name, name)
                field_names.append(ir_field.field_description)
        if field_names:
            raise ValidationError(
                _("The following fields must be filled: %s", ", ".join(field_names))
            )

    @api.model
    def _create_missing_journals(self, company=None):
        """ Create a journal for installed acquirers missing one.

        Each acquirer must have its own journal. It can't however be created along the
        `payment.acquirer` record because there is no guarantee that the chart template is already
        installed.

        :param recordset company: The company for which the journals are created, as a `res.company`
                                  recordset
        :return: The created journals
        :rtype: recordset of `account.journal`
        """
        # Search for installed acquirer modules having no journal for the current company
        company = company or self.env.company
        acquirers = self.env['payment.acquirer'].search([
            ('journal_id', '=', False),
            ('company_id', '=', company.id),
            ('module_state', 'in', ('to install', 'installed')),
        ])

        # Create or find the missing journals.
        # This is done in this order and not the other way around because the most common cause for
        # a missing journal is the first install of an acquirer's module. The other (less common)
        # cause is a re-install. In this last case, the creation will fail because of a unique
        # constraint violation, we catch the error, and fallback on searching the previous journal.
        Journal = journals = self.env['account.journal']
        for acquirer in acquirers.filtered('company_id.chart_template_id'):
            # acquirer.journal_id = Journal.create(acquirer._get_journal_create_values())
            # journals += acquirer.journal_id
            try:
                with self.env.cr.savepoint():
                    journal = Journal.create(acquirer._get_journal_create_values())
            except psycopg2.IntegrityError as error:  # Journal already exists
                if error.pgcode == psycopg2.errorcodes.UNIQUE_VIOLATION:
                    journal = Journal.search(acquirer._get_journal_search_domain(), limit=1)
                else:
                    raise error
            acquirer.journal_id = journal
            journals += journal
        return journals  # TODO ANV do we actually need returning those ?

    def _get_journal_create_values(self):
        """ Return a dict of values to create the acquirer's journal.

        Note: self.ensure_one()

        :return: The dict of create values for `account.journal`
        :rtype: dict
        """
        self.ensure_one()

        account_vals = self.company_id.chart_template_id. \
            _prepare_transfer_account_for_direct_creation(self.name, self.company_id)
        account = self.env['account.account'].create(account_vals)
        inbound_payment_method_ids = []
        if self.allow_tokenization:
            inbound_payment_method_ids.append(
                (4, self.env.ref('payment.account_payment_method_electronic_in').id)
            )
        return {
            'name': self.name,
            'code': self.name.upper(),
            'sequence': 999,
            'type': 'bank',
            'company_id': self.company_id.id,
            'default_account_id': account.id,
            # Show the journal on dashboard if the acquirer is published on the website.
            'show_on_dashboard': self.state == 'enabled',
            # Don't show payment methods in the backend
            'inbound_payment_method_ids': inbound_payment_method_ids,
            'outbound_payment_method_ids': [],
        }

    def _get_journal_search_domain(self):
        """ Return a domain for searching a journal corresponding to the acquirer.

        Note: self.ensure_one()

        :return: The search domain
        :rtype: list
        """
        self.ensure_one()

        code_cutoff = self.env['account.journal']._fields['code'].size
        return [
            ('name', '=', self.name),
            ('code', '=', self.name.upper()[:code_cutoff]),
            ('company_id', '=', self.company_id.id),
        ]

    #=== BUSINESS METHODS ===#

    @api.model
    def _get_compatible_acquirers(
        self, company_id, partner_id, allow_tokenization=False, preferred_acquirer_id=None,
        **_kwargs
    ):
        """ Select and return the acquirers matching the criteria.

        The base criteria are that acquirers must not be disabled, be in the company that is
        provided, and support the country of the partner if it exists.

        If a `preferred_acquirer_id` is specified, only the corresponding acquirer is returned.
        If that acquirer does not exist or does not match the criteria, only the acquirers that
        do match them are returned.

        :param int company_id: The company to which acquirers must belong, as a `res.company` id
        :param int partner_id: The partner making the payment, as a `res.partner` id
        :param bool allow_tokenization: Whether matching acquirers must allow tokenization
        :param int preferred_acquirer_id: The preferred acquirer, as a `payment.acquirer` id
        :param dict _kwargs: Optional data. This parameter is not used here
        :return: The compatible acquirers
        :rtype: recordset of `payment.acquirer`
        """
        # Compute the base domain for compatible acquirers
        domain = ['&', ('state', 'in', ['enabled', 'test']), ('company_id', '=', company_id)]
        partner = self.env['res.partner'].browse(partner_id)

        # Handle partner country
        if partner.country_id:  # The partner country must either not be set or be supported
            domain = expression.AND([
                domain,
                ['|', ('country_ids', '=', False), ('country_ids', 'in', [partner.country_id.id])]
            ])

        # Handle tokenization support
        if allow_tokenization:
            domain = expression.AND([domain, [('allow_tokenization', '=', True)]])

        # Handle preferred acquirer
        compatible_acquirers = None
        if preferred_acquirer_id:  # If an acquirer is preferred, check that it matches the criteria
            compatible_acquirers = self.env['payment.acquirer'].search(expression.AND([
                domain, [('id', '=', preferred_acquirer_id)]
            ]))
        if not compatible_acquirers:  # If not found or incompatible, fallback on the others
            compatible_acquirers = self.env['payment.acquirer'].search(domain)

        return compatible_acquirers

    def _get_inline_template_view_xml_id(self):
        """ Get the xml id of the inline form template.

        Note: self.ensure_one()

        :return: The xml id of the inline form template
        :rtype: str|None
        """
        if self.inline_template_view_id:
            model_data = self.env['ir.model.data'].search(
                [('model', '=', 'ir.ui.view'), ('res_id', '=', self.inline_template_view_id.id)]
            )
            return f'{model_data.module}.{model_data.name}'
        return None

    def _get_base_url(self):
        """ Get the base url of the website on which the payment is made.

        Note: self.ensure_one()

        :return: The website base url
        :rtype: str
        """
        self.ensure_one()
        url = ''
        if request:  # Give priority to url_root to handle multi-website cases
            url = request.httprequest.url_root
        if not url:  # Fallback to web.base.url
            url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        return url

    def _compute_fees(self, _amount, _currency_id, _country_id):
        """ Compute the acquirer-specific fees given a transaction context.

        For an acquirer to implement fees computation, it must override this method and return the
        resulting fees as a float.

        Note: self.ensure_one()

        :param float _amount: The amount to pay for the transaction
        :param int _currency_id: The currency of the transaction, as a `res.currency` id
        :param int _country_id|None: The customer country as a `res.country` id
        :return: The computed fees
        :rtype: float
        """
        self.ensure_one()
        return 0.

    def _get_validation_amount(self):
        """ Get the amount to transfer in a payment method validation operation.

        For an acquirer to support tokenization, it must override this method and return the amount
        to be transferred in a payment method validation operation.

        Note: self.ensure_one()

        :return: The validation amount
        :rtype: float
        """
        self.ensure_one()
        return 0.

    def _get_validation_currency(self):
        """ Get the currency of the transfer in a payment method validation operation.

        For an acquirer to support tokenization, it must override this method and return the
        currency of the transfer in a payment method validation operation.

        Note: self.ensure_one()

        :return: The validation currency
        :rtype: recordset of `res.currency`
        """
        self.ensure_one()
        return self.journal_id.currency_id or self.company_id.currency_id

    # --> CLEANED & SORTED |

    def s2s_process(self, data):
        """ TODO. """
        cust_method_name = '%s_s2s_form_process' % (self.provider)
        if not self.s2s_validate(data):
            return False
        if hasattr(self, cust_method_name):
            # As this method may be called in JSON and overridden in various addons
            # let us raise interesting errors before having strange crashes
            if not data.get('partner_id'):
                raise ValueError(_('Missing partner reference when trying to create a new payment token'))
            method = getattr(self, cust_method_name)
            return method(data)
        return True

    def s2s_validate(self, data):
        """ TODO. """
        cust_method_name = '%s_s2s_form_validate' % (self.provider)
        if hasattr(self, cust_method_name):
            method = getattr(self, cust_method_name)
            return method(data)
        return True

    def button_immediate_install(self):
        """ TODO. """
        if self.module_id and self.module_state != 'installed':
            self.module_id.button_immediate_install()
            return {
                'type': 'ir.actions.client',
                'tag': 'reload',
            }
