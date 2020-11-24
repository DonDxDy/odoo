# -*- encoding: utf-8 -*-
from . import models


def _document_blocked_level_post_init(cr, registery):
    ''' The default value for blocked_level is 'error', but without this module,
    the behavior is the same as a blocked_level of 'warning' so we need to set
    all documents in error.
    '''
    from odoo import api, SUPERUSER_ID

    env = api.Environment(cr, SUPERUSER_ID, {})
    env['account.edi.document'].search([('error', '=', True)]).write({'blocked_level': 'warning'})
