odoo.define('mail/static/src/components/thread-textual-typing-status/thread-textual-typing-status.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;

class ThreadTextualTypingStatus extends usingModels(Component) {}

Object.assign(ThreadTextualTypingStatus, {
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
    template: 'mail.ThreadTextualTypingStatus',
});

QWeb.registerComponent('ThreadTextualTypingStatus', ThreadTextualTypingStatus);

return ThreadTextualTypingStatus;

});
