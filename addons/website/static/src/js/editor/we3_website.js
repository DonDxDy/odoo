odoo.define('website.editor.we3', function (require) {
'use strict';

var core = require('web.core');
var _t = core._t;


we3.addArchNode('WEBSITE-EDITABLE', class extends we3.ArchNode {
    constructor () {
        super(...arguments);
        this.className.add('o_editable');
    }

    //--------------------------------------------------------------------------
    // static
    //--------------------------------------------------------------------------

    static parse (archNode) {
        if (archNode.attributes && archNode.attributes['data-oe-model']) {
            var editable = archNode.params.create(archNode.nodeName, archNode.attributes, null, 'WEBSITE-EDITABLE');
            editable.append(archNode.childNodes);
            return editable;
        }
    }

    //--------------------------------------------------------------------------
    // public
    //--------------------------------------------------------------------------

    getFieldType () {
        return this.attributes['data-oe-type'] || 'html';
        // TOTO: use for paste text only in not html field
        // TODO: drop image only in image or html field
        // TODO: can choose only image in media
        // ===> var type = achNode.ancestor('isWebsiteEditable').getFieldType();
    }
    isDirty () {
        return this.className.contains('o_dirty');
    }
    isEditable () {
        return !this.isReadOnly();
    }
    isReadOnly () {
        // TODO use for display readonly tooltip
        return this.attributes['data-oe-readonly'] || this.className.contains('o_not_editable');
    }
    isWebsiteEditable () {
        return true;
    }
    get type () {
        return 'WEBSITE-EDITABLE';
    }
});


var OdooWebsite = class extends we3.AbstractPlugin {
    constructor () {
        super(...arguments);
        this.dependencies = ['Range', 'Arch', 'Renderer', 'Rules'];
    }

    //--------------------------------------------------------------------------
    // Live cycle
    //--------------------------------------------------------------------------

    start () {
        super.start();
        this._overwriteBootstrap();
        this.dependencies.Range.on('focus', this, this._onFocusNode);

        this.dependencies.Rules.addEditableNodeCheck(function (archNode) {
            if (archNode.isRoot()) {
                return false;
            }
            if (!archNode.className) {
                return undefined;
            }
            if (archNode.className.contains('o_not_editable')) {
                return false;
            }
            if (archNode.className.contains('o_editable')) {
                return true;
            }
        });
    }
    destroy () {
        super.destroy();
        $.fn.carousel = this.init_bootstrap_carousel;
    }

    /**
     * @overwrite
     */
    changeEditorValue (changes) {
        var Renderer = this.dependencies.Renderer;
        var focused = this.dependencies.Range.getFocusedNode();
        var editable = focused.ancestor('isWebsiteEditable');
        if (editable && !editable.className.contains('o_dirty')) {
            editable.className.add('o_dirty');
            this.dependencies.Arch.importUpdate([{
                id: editable.id,
                attributes: editable.attributes,
            }], this.dependencies.Range.getRange());
        }
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    getBrandingNodeIds () {
        var ids = [];
        var Arch = this.dependencies.Arch;
        var Renderer = this.dependencies.Renderer;
        Arch.getNode(1).nextUntil(function (next) {
            if (next.type === 'WEBSITE-EDITABLE') {
                ids.push(next.id);
            }
        });
        return ids;
    }
    setEditorValue () {
        var ids = this.getBrandingNodeIds();
        this._postRenderingReadOnly(ids);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    _onFocusNode (focused) {
        var focused = this.dependencies.Range.getFocusedNode();
        var editable = focused.ancestor('isWebsiteEditable');
        var res_model = editable && editable.attributes['data-oe-model'];
        var res_id = editable && +editable.attributes['data-oe-id'];
        var xpath = editable && editable.attributes['data-oe-xpath'];

        if (!res_model && $('html').data('editable')) {
            var object = $('html').data('main-object');
            res_model = object.split('(')[0];
            res_id = +object.split('(')[1].split(',')[0];
        }

        if (focused.ancestor('isMedia') && (res_model === 'website.page' || res_model === 'ir.ui.view')) {
            res_id = 0;
            res_model = 'ir.ui.view';
            xpath = null;
        }

        this.options.xhr.res_model = res_model;
        this.options.xhr.res_id = res_id;
        this.options.xhr.xpath = xpath;

        console.log(res_model, res_id, xpath);
    }
    _overwriteBootstrap () {
        var self = this;
        // BOOTSTRAP preserve
        this.init_bootstrap_carousel = $.fn.carousel;
        $.fn.carousel = function () {
            var res = self.init_bootstrap_carousel.apply(this, arguments);
            // off bootstrap keydown event to remove event.preventDefault()
            // and allow to change cursor position
            $(this).off('keydown.bs.carousel');
            return res;
        };
    }
    _postRenderingReadOnly (ids) {
        var Arch = this.dependencies.Arch;
        var Renderer = this.dependencies.Renderer;
        var readonly = ids.filter(function (id) {
            return Arch.getNode(id).isReadOnly();
        });
        var $readonly = $(readonly.map(function (id) {
            return Renderer.getElement(id);
        }));
        $readonly.tooltip({
                container: 'body',
                trigger: 'hover',
                delay: {
                    'show': 1000,
                    'hide': 100,
                },
                placement: 'bottom',
                title: _t("Readonly field")
            })
            .on('click', function () {
                $(this).tooltip('hide');
            });
    }
};

we3.addPlugin('OdooWebsite', OdooWebsite);

});
