odoo.define('mail/static/src/components/thread-icon/thread-icon.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;

class ThreadIcon extends usingModels(Component) {}

Object.assign(ThreadIcon, {
    props: {
        thread: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Thread') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.ThreadIcon',
});

QWeb.registerComponent('ThreadIcon', ThreadIcon);

return ThreadIcon;

});
