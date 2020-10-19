# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import re
import uuid

from odoo import fields, models, api


class UtmObject(models.AbstractModel):
    """Mixin class for UTM objects (source, medium, campaign...).

    Store all the common fields/behavior of the UTM objects in this class (like the name,
    the identifier, the generation of the identifier...).
    """

    _name = 'utm.object'
    _description = 'UTM Object'

    name = fields.Char(string='Name', required=True, translate=True)
    identifier = fields.Char(
        string='Identifier', readonly=True, index=True, copy=False)

    @api.model
    def create(self, vals):
        if vals.get('name') and not vals.get('identifier'):
            vals['identifier'] = self._generate_identifier_from_name(vals.get('name'))

        elif vals.get('identifier') and not vals.get('name'):
            # auto-generate the name based on the identifier
            # e.g.: when an unknown UTM medium is found in the cookies
            vals['name'] = self._generate_name_from_identifier(vals.get('identifier'))

        return super(UtmObject, self).create(vals)

    def _generate_identifier_from_name(self, name):
        """Generate the identifier of the UTM records based on the name.

        The identifier is generated from the name, but if a duplication is detected, we add
        some random chars at the end.
        """
        identifier = name.lower().replace(' ', '_')
        similar_identifiers = self.env[self._name].search_count([('identifier', 'like', identifier)])
        if similar_identifiers:
            identifier = f'{identifier}_[{str(uuid.uuid4())[:8]}]'
        return identifier

    def _generate_name_from_identifier(self, identifier):
        """Generate the identifier of the UTM records based on the identifier.

        If we detect some random chars at the end we remove it.
        """
        match = re.match(r'(.*)_\[[a-zA-Z0-9]+\]', identifier)
        if match:
            name = match.group(1)
        else:
            name = identifier
        return name.replace('_', ' ').title()

    _sql_constraints = [
        ('unique_identifier', 'UNIQUE(identifier)', 'The identifier must be unique')
    ]
