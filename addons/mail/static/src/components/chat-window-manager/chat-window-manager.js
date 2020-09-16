odoo.define('mail/static/src/components/chat-window-manager/chat-window-manager.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;

class ChatWindowManager extends usingModels(Component) {}

Object.assign(ChatWindowManager, {
    props: {},
    template: 'mail.ChatWindowManager',
});

QWeb.registerComponent('ChatWindowManager', ChatWindowManager);

return ChatWindowManager;

});
