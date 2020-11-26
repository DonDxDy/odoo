# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Web Editor',
    'category': 'Hidden',
    'description': """
Odoo Web Editor widget.
==========================

    """,
    'depends': ['web'],
    'data': [
        'security/ir.model.access.csv',
        'views/editor.xml',
        'views/snippets.xml',
    ],
    'assets': {
        'qweb': [
            'static/src/xml/*.xml',
        ],
        'assets_wysiwyg': [
            # lib
            'web_editor/static/lib/cropperjs/cropper.css',
            'web_editor/static/lib/cropperjs/cropper.js',
            'web_editor/static/lib/jquery-cropper/jquery-cropper.js',
            'web_editor/static/lib/jQuery.transfo.js',
            'web/static/lib/nearest/jquery.nearest.js',
            'web_editor/static/lib/webgl-image-filter/webgl-image-filter.js',

            # odoo utils
            '_assets_helpers_primary',

            'web_editor/static/src/scss/bootstrap_overridden.scss',

            '_assets_helpers_secondary',

            # integration
            'web_editor/static/src/scss/wysiwyg.scss',
            'web_editor/static/src/scss/wysiwyg_snippets.scss',

            'web_editor/static/src/js/wysiwyg/fonts.js',
            'web_editor/static/src/js/base.js',
            'web_editor/static/src/js/editor/image_processing.js',
            'web_editor/static/src/js/editor/custom_colors.js',

            # widgets & plugins
            'web_editor/static/src/js/wysiwyg/widgets/media.js',
            'web_editor/static/src/js/wysiwyg/widgets/dialog.js',
            'web_editor/static/src/js/wysiwyg/widgets/alt_dialog.js',
            'web_editor/static/src/js/wysiwyg/widgets/color_palette.js',
            'web_editor/static/src/js/wysiwyg/widgets/image_crop_widget.js',
            'web_editor/static/src/js/wysiwyg/widgets/link_dialog.js',
            'web_editor/static/src/js/wysiwyg/widgets/media_dialog.js',
            'web_editor/static/src/js/wysiwyg/widgets/widgets.js',
            'web_editor/static/src/js/editor/snippets.editor.js',
            'web_editor/static/src/js/editor/snippets.options.js',

            # Launcher
            'web_editor/static/lib/jabberwock/jabberwock.js',
            'web_editor/static/lib/jabberwock/jabberwock.css',
            'web_editor/static/src/js/wysiwyg/wysiwyg_translate_attributes.js',
            'web_editor/static/src/js/wysiwyg/wysiwyg.js',
        ],
        '_assets_primary_variables': [
            'web_editor/static/src/scss/web_editor.variables.scss',
        ],
        '_assets_13_0_color_system_support_primary_variables': [
            'web_editor/static/src/scss/13_0_color_system_support_primary_variables.scss',
        ],
        '_assets_secondary_variables': [
            'web_editor/static/src/scss/secondary_variables.scss',
        ],
        'assets_common': [
            'web_editor/static/lib/vkbeautify/vkbeautify.0.99.00.beta.js',
            'web_editor/static/src/js/common/ace.js',
            'web_editor/static/src/js/common/utils.js',
            'web_editor/static/src/js/wysiwyg/root.js',
        ],
        '_assets_backend_helpers': [
            'web_editor/static/src/scss/bootstrap_overridden_backend.scss',
            'web_editor/static/src/scss/bootstrap_overridden.scss',
        ],
        'assets_backend': [
            'web_editor/static/src/scss/web_editor.common.scss',
            'web_editor/static/src/scss/web_editor.backend.scss',

            'web_editor/static/src/js/frontend/loader.js"',
            'web_editor/static/src/js/backend/field_html.js"',
        ],
        '_assets_frontend_helpers': [
            'web_editor/static/src/scss/bootstrap_overridden.scss',
        ],
        'assets_frontend_minimal_scripts': [
            'web_editor/static/src/js/frontend/loader_loading.js',
        ],
        'assets_frontend': [
            'web_editor/static/src/scss/web_editor.common.scss',
            'web_editor/static/src/scss/web_editor.frontend.scss',

            'web_editor/static/src/js/frontend/loader.js',
        ],
        'qunit_suite_tests': [
            'web_editor/static/tests/test_utils.js',
            'web_editor/static/tests/field_html_tests.js',
        ],
    },
    'auto_install': True
}
