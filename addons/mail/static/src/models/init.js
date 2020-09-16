odoo.define('mail/static/src/models/init.js', function (require) {
'use strict';

const {
    addFeature,
} = require('mail/static/src/model/core.js');

addFeature(
    'mail',
    require('/mail/static/src/models/activity/activity.js'),
    require('/mail/static/src/models/activity-type/activity-type.js'),
    require('/mail/static/src/models/attachment/attachment.js'),
    require('/mail/static/src/models/attachment-viewer/attachment-viewer.js'),
    require('/mail/static/src/models/canned-response/canned-response.js'),
    require('/mail/static/src/models/channel-command/channel-command.js'),
    require('/mail/static/src/models/chat-window/chat-window.js'),
    require('/mail/static/src/models/chat-window-manager/chat-window-manager.js'),
    require('/mail/static/src/models/chatter/chatter.js'),
    require('/mail/static/src/models/composer/composer.js'),
    require('/mail/static/src/models/country/country.js'),
    require('/mail/static/src/models/device/device.js'),
    require('/mail/static/src/models/dialog/dialog.js'),
    require('/mail/static/src/models/dialog-manager/dialog-manager.js'),
    require('/mail/static/src/models/discuss/discuss.js'),
    require('/mail/static/src/models/follower/follower.js'),
    require('/mail/static/src/models/follower-subtype/follower-subtype.js'),
    require('/mail/static/src/models/follower-subtype-list/follower-subtype-list.js'),
    require('/mail/static/src/models/locale/locale.js'),
    require('/mail/static/src/models/mail-template/mail-template.js'),
    require('/mail/static/src/models/message/message.js'),
    require('/mail/static/src/models/message-seen-indicator/message-seen-indicator.js'),
    require('/mail/static/src/models/messaging/messaging.js'),
    require('/mail/static/src/models/messaging-initializer/messaging-initializer.js'),
    require('/mail/static/src/models/messaging-menu/messaging-menu.js'),
    require('/mail/static/src/models/messaging-notification-handler/messaging-notification-handler.js'),
    require('/mail/static/src/models/notification/notification.js'),
    require('/mail/static/src/models/notification-group/notification-group.js'),
    require('/mail/static/src/models/notification-group-manager/notification-group-manager.js'),
    require('/mail/static/src/models/partner/partner.js'),
    require('/mail/static/src/models/suggested-recipient-info/suggested-recipient-info.js'),
    require('/mail/static/src/models/thread/thread.js'),
    require('/mail/static/src/models/thread-cache/thread-cache.js'),
    require('/mail/static/src/models/thread-partner-seen-info/thread-partner-seen-info.js'),
    require('/mail/static/src/models/vhread-view/thread-view.js'),
    require('/mail/static/src/models/thread-view/thread-viewer.js'),
    require('/mail/static/src/models/user/user.js'),
);

});
