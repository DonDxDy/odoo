odoo.define('website.s_rating_options', function (require) {
'use strict';

const weWidgets = require('wysiwyg.widgets');
const snippetOptions = require('web_editor.snippets.options');

snippetOptions.registry.Rating = snippetOptions.SnippetOptionsWidget.extend({
    /**
     * @override
     */
    start: function () {
        this.iconType = this.$target[0].dataset.icon;
        this.faClassActiveCustomIcons = this.$target[0].dataset.activeCustomIcon || '';
        this.faClassInactiveCustomIcons = this.$target[0].dataset.inactiveCustomIcon || '';
        return this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Options
    //--------------------------------------------------------------------------

    /**
     * Displays the selected icon type.
     *
     * @see this.selectClass for parameters
     */
    setIcons: async function (previewMode, widgetValue, params) {
        this.iconType = widgetValue;
        this._renderIcons();
        this.$target[0].dataset.icon = widgetValue;
        delete this.$target[0].dataset.activeCustomIcon;
        delete this.$target[0].dataset.inactiveCustomIcon;

        if (previewMode === false) await this._refreshTarget();
    },
    /**
     * Allows to select a font awesome icon with media dialog.
     *
     * @see this.selectClass for parameters
     */
    customIcon: async function (previewMode, widgetValue, params) {
        await new Promise(resolve => {
            const dialog = new weWidgets.MediaDialog(
                this,
                {noImages: true, noDocuments: true, noVideos: true, mediaWidth: 1920},
                $('<i/>')
            );
            this._saving = false;
            dialog.on('save', this, function (attachments) {
                this._saving = true;
                const customClass = 'fa ' + attachments.className;
                const $activeIcons = this.$target.find('.s_rating_active_icons > i');
                const $inactiveIcons = this.$target.find('.s_rating_inactive_icons > i');
                const $icons = params.customActiveIcon === 'true' ? $activeIcons : $inactiveIcons;
                $icons.removeClass().addClass(customClass);
                this.faClassActiveCustomIcons = $activeIcons.length > 0 ? $activeIcons.attr('class') : customClass;
                this.faClassInactiveCustomIcons = $inactiveIcons.length > 0 ? $inactiveIcons.attr('class') : customClass;
                this.$target[0].dataset.activeCustomIcon = this.faClassActiveCustomIcons;
                this.$target[0].dataset.inactiveCustomIcon = this.faClassInactiveCustomIcons;
                this.$target[0].dataset.icon = 'custom';
                this.iconType = 'custom';
                resolve();
            });
            dialog.on('closed', this, function () {
                if (!this._saving) {
                    resolve();
                }
            });
            dialog.open();
        });

        if (previewMode === false) await this._refreshTarget();
    },
    /**
     * Sets the number of active icons.
     *
     * @see this.selectClass for parameters
     */
    activeIconsNumber: async function (previewMode, widgetValue, params) {
        this.nbActiveIcons = parseInt(widgetValue);
        this._createIcons();
        if (previewMode === false) await this._refreshTarget();
    },
    /**
     * Sets the total number of icons.
     *
     * @see this.selectClass for parameters
     */
    totalIconsNumber: async function (previewMode, widgetValue, params) {
        this.nbTotalIcons = Math.max(parseInt(widgetValue), 1);
        this._createIcons();
        if (previewMode === false) await this._refreshTarget();
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @override
     */
    _computeWidgetState: function (methodName, params) {
        switch (methodName) {
            case 'setIcons': {
                return this.$target[0].dataset.icon;
            }
            case 'activeIconsNumber': {
                this.nbActiveIcons = this.$target.find('.s_rating_active_icons > i').length;
                return this.nbActiveIcons;
            }
            case 'totalIconsNumber': {
                this.nbTotalIcons = this.$target.find('.s_rating_icons i').length;
                return this.nbTotalIcons;
            }
        }
        return this._super(...arguments);
    },
    /**
     * Creates the icons.
     *
     * @private
     */
    _createIcons: function () {
        const $activeIcons = this.$target.find('.s_rating_active_icons');
        const $inactiveIcons = this.$target.find('.s_rating_inactive_icons');
        this.$target.find('.s_rating_active_icons, .s_rating_inactive_icons').empty();
        for (let i = 0; i < this.nbTotalIcons; i++) {
            if (i < this.nbActiveIcons) {
                $activeIcons.append('<i/> ');
            } else {
                $inactiveIcons.append('<i/> ');
            }
        }
        this._renderIcons();
    },
    /**
     * Renders icons with selected fonts.
     *
     * @private
     */
    _renderIcons: function () {
        const icons = {
            'fa-star': 'fa-star-o',
            'fa-thumbs-up': 'fa-thumbs-o-up',
            'fa-circle': 'fa-circle-o',
            'fa-square': 'fa-square-o',
            'fa-heart': 'fa-heart-o'
        };
        const faClassActiveIcons = (this.iconType === "custom") ? this.faClassActiveCustomIcons : 'fa ' + this.iconType;
        const faClassInactiveIcons = (this.iconType === "custom") ? this.faClassInactiveCustomIcons : 'fa ' + icons[this.iconType];
        const $activeIcons = this.$target.find('.s_rating_active_icons > i');
        const $inactiveIcons = this.$target.find('.s_rating_inactive_icons > i');
        $activeIcons.removeClass().addClass(faClassActiveIcons);
        $inactiveIcons.removeClass().addClass(faClassInactiveIcons);
    },
});
});
