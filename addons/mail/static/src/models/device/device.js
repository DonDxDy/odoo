odoo.define('mail/static/src/models/device/device.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * Called when messaging is started.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Device} device
     */
    'Device/start'(
        { env },
        device
    ) {
        const _onResize = _.debounce(
            () => env('Device/_refresh', device),
            100
        );
        Object.assign(device, { _onResize });
        // TODO FIXME Not using this.env.browser because it's proxified, and
        // addEventListener does not work on proxified window. task-2234596
        window.addEventListener('resize', device._onResize);
        env.invoke('Device/_refresh', device);
    },
    'Device/stop'(
        _,
        device,
    ) {
        window.removeEventListener('resize', device._onResize);
        device._onResize = () => {};
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Device} device
     */
    'Device/_refresh'(
        { env },
        device
    ) {
        env.invoke('Record/update', device, {
            $$$globalWindowInnerHeight: env.browser.innerHeight,
            $$$globalWindowInnerWidth: env.browser.innerWidth,
            $$$isMobile: env.device.isMobile,
        });
    },
});

const model = defineModel({
    name: 'Device',
    fields: {
        $$$globalWindowInnerHeight: attr(),
        $$$globalWindowInnerWidth: attr(),
        $$$isMobile: attr(),
    }
});

return defineFeatureSlice(
    'mail/static/src/models/device/device.js',
    actions,
    model,
);

});
