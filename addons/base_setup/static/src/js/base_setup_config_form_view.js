odoo.define('base_setup.res.config.form', function (require) {
    "use strict";

    const BaseSetting = require('base.settings');
    const core = require('web.core');
    const config = require('web.config');
    const viewRegistry = require('web.view_registry');

    const _t = core._t;

    const BaseSettingConfigQRCodeMixin = {
        events: {
            'click .o_config_app_store, .o_config_play_store': '_onClickAppStoreIcon',
        },

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         * @param {MouseEvent} ev
         */
        _onClickAppStoreIcon(ev) {
            ev.stopPropagation();
            ev.preventDefault();
            const googleUrl = "https://play.google.com/store/apps/details?id=com.odoo.OdooTimesheets";
            const appleUrl = "https://apps.apple.com/be/app/awesome-timesheet/id1078657549";
            const url = ev.target.classList.contains("o_config_play_store") ? googleUrl : appleUrl;

            if (!config.device.isMobile) {
                const actionDesktop = {
                    name: _t('Download our Mobile App'),
                    type: 'ir.actions.client',
                    tag: 'base_setting_qr_code_modal',
                    target: 'new',
                };
                this.do_action(_.extend(actionDesktop, {params: {'url': url}}));
            } else {
                this.do_action({type: 'ir.actions.act_url', url: url});
            }
        },

    };


    const BaseSettingFormRenderer = BaseSetting.Renderer.extend(BaseSettingConfigQRCodeMixin);

    const BaseSettingView = viewRegistry.get('base_settings');
    const BaseSettingConfigFormView = BaseSettingView.extend({
        config: _.extend({}, BaseSettingView.prototype.config, {
            Renderer : BaseSettingFormRenderer,
        }),
    });

    viewRegistry.add('base_setup_config_form', BaseSettingConfigFormView);

    return {BaseSettingConfigQRCodeMixin, BaseSettingFormRenderer, BaseSettingConfigFormView};

});
