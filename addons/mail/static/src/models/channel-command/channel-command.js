odoo.define('mail/static/src/models/channel-command/channel-command.js', function (require) {
'use strict';

const {
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
} = require('mail/static/src/model/utils.js');

const model = defineModel({
    name: 'ChannelCommand',
    fields: {
        /**
         * Determines on which channel types `this` is available.
         * Type of the channel (e.g. 'chat', 'channel' or 'groups')
         * This field should contain an array when filtering is desired.
         * Otherwise, it should be undefined when all types are allowed.
         */
        $$$channelTypes: attr(),
        /**
         *  The command that will be executed.
         */
        $$$help: attr(),
        /**
         *  The keyword to use a specific command.
         */
        $$$name: attr({
            id: true,
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/channel-command/channel-command.js',
    model,
);

});
