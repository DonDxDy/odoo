# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import os
import re

from glob import glob
from logging import getLogger

from odoo import fields, http, models


_logger = getLogger(__name__)

SCRIPT_EXTENSIONS = ['js', 'ts']
STYLE_EXTENSIONS = ['css', 'scss', 'sass', 'less']
TEMPLATE_EXTENSIONS = ['xml']

def fs2web(path):
    """convert FS path into web path"""
    return '/'.join(path.split(os.path.sep))


class IrAsset(models.Model):
    """
    """

    _name = 'ir.asset'
    _description = 'Asset'

    bundle = fields.Char()
    files = fields.Char()

    def get_addon_files(self, addons, bundle, css=False, js=False, xml=False):
        """
        """
        exts = []
        if js:
            exts += SCRIPT_EXTENSIONS
        if css:
            exts += STYLE_EXTENSIONS
        if xml:
            exts += TEMPLATE_EXTENSIONS

        manifests = http.addons_manifest
        addon_files = []
        for addon in addons:
            manifest = manifests.get(addon)

            if not manifest:
                continue

            assets = manifest.get('assets', {})
            bundle_paths = assets.get(bundle, [])

            # for asset in self.search([("bundle", "=", bundle)]):
            #     bundle_paths += asset.files.split(',')

            for path_def in bundle_paths:
                path_addon = path_def.split('/')[0]
                path_addon_manifest = manifests.get(path_addon)

                glob_paths = []

                if path_addon_manifest:
                    addons_path = os.path.join(path_addon_manifest['addons_path'], '')[:-1]

                    full_path = os.path.normpath(os.path.join(addons_path, path_def))

                    for path in sorted(glob(full_path, recursive=True)):
                        ext = path.split('.')[-1]
                        if not exts or ext in exts:
                            glob_path = path[len(addons_path):] if ext != 'xml' else path
                            glob_paths.append((addon, fs2web(glob_path)))

                if not len(glob_paths):
                    # Path def is considered as a bundle if no file matches the glob
                    glob_paths = self.get_addon_files(addons, path_def, css, js, xml)

                [addon_files.append((addon, file))
                    for addon, file in glob_paths
                    if (addon, file) not in addon_files
                ]

        return addon_files
