odoo.define('mail/static/src/components/message-author-prefix/message-author-prefix.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component } = owl;

class MessageAuthorPrefix extends usingModels(Component) {}

Object.assign(MessageAuthorPrefix, {
    props: {
        message: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Message') {
                    return false;
                }
                return true;
            },
        },
        thread: {
            type: Object,
            optional: true,
            validate(p) {
                if (p.constructor.modelName !== 'Thread') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.MessageAuthorPrefix',
});

return MessageAuthorPrefix;

});
