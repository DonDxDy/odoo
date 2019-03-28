# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import api, SUPERUSER_ID
from . import models
from . import wizard


def neuter(cr,registry):
    env = api.Environment(cr, SUPERUSER_ID, {})
    to_neuter = env['delivery.carrier'].search([('active','=',True),])
    to_neuter.write({'active':False,'has_been_neutered':True}) 

def reverse_neuter(cr,registry):
    env = api.Environment(cr, SUPERUSER_ID, {})
    to_reverse_neutering = env['delivery.carrier'].with_context(active_test=False).search([('has_been_neutered','=',True)])
    to_reverse_neutering.write({'active':True,'has_been_neutered':False})