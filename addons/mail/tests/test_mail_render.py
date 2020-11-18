# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.addons.mail.tests import common
from odoo.tests import tagged, users


@tagged('mail_render')
class TestMailRender(common.MailCommon):

    @classmethod
    def setUpClass(cls):
        super(TestMailRender, cls).setUpClass()

        # activate multi language support
        cls.env['res.lang']._activate_lang('fr_FR')
        cls.user_admin.write({'lang': 'en_US'})

        # test records
        cls.render_object = cls.env['res.partner'].create({
            'name': 'TestRecord',
            'lang': 'en_US',
        })
        cls.render_object_fr = cls.env['res.partner'].create({
            'name': 'Element de Test',
            'lang': 'fr_FR',
        })

        # some jinja templates
        cls.base_jinja_bits = [
            '<p>Hello</p>',
            '<p>Hello ${object.name}</p>',
            """<p>
% set english = object.lang == 'en_US'
% if english
    <span>English Speaker</span>
% else
    <span>Other English</span>
% endif
</p>"""
        ]

        # some qweb templates and their xml ids
        cls.base_qweb_templates = cls.env['ir.ui.view'].create([
            {'name': 'TestRender', 'type': 'qweb',
             'arch': '<p>Hello</p>',
            },
            {'name': 'TestRender2', 'type': 'qweb',
             'arch': '<p>Hello <t t-esc="object.name"/></p>',
            },
            {'name': 'TestRender3', 'type': 'qweb',
             'arch': """<p>Hello
    <span t-if="object.lang == 'en_US'">English Speaker</span>
    <span t-else="">Other Speaker</span></p>""",
            },
        ])
        cls.base_qweb_templates_data = cls.env['ir.model.data'].create([
            {'name': template.name, 'module': 'mail',
             'model': template._name, 'res_id': template.id,
            } for template in cls.base_qweb_templates
        ])
        cls.base_qweb_templates_xmlids = [
            model_data.complete_name
            for model_data in cls.base_qweb_templates_data
        ]

        # render result
        cls.base_rendered = [
            '<p>Hello</p>',
            '<p>Hello %s</p>' % cls.render_object.name,
            'Cacaprout'
        ]

        # some translations
        # cls.env['ir.translation'].create({
        #     'type': 'model',
        #     'name': 'sm.template,body',
        #     'lang': 'fr_FR',
        #     'res_id': cls.sms_template.id,
        #     'src': cls.sms_template.body,
        #     'value': cls.body_fr,
        # })

        # cls.env['ir.model.data'].create({
        #     'name': 'this_should_exists',
        #     'module': 'test_mail_full',
        #     'model': sms_template._name,
        #     'res_id': sms_template.id,
        # })

    @users('employee')
    def test_render_jinja(self):
        partner = self.env['res.partner'].browse(self.render_object.ids)
        for source, expected in zip(self.base_jinja_bits, self.base_rendered):
            rendered = self.env['mail.render.mixin']._render_template(
                source,
                partner._name,
                partner.ids,
                engine='jinja',
            )[partner.id]
            self.assertEqual(rendered, expected)

    @users('employee')
    def test_render_qweb(self):
        partner = self.env['res.partner'].browse(self.render_object.ids)
        for source, expected in zip(self.base_qweb_templates_xmlids, self.base_rendered):
            rendered = self.env['mail.render.mixin']._render_template(
                source,
                partner._name,
                partner.ids,
                engine='qweb',
            )[partner.id]
            # TDE FIXME: temp
            rendered2 = rendered.decode()
            self.assertEqual(rendered2, expected)
