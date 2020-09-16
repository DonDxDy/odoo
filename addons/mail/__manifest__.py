# -*- coding: utf-8 -*-

{
    'name': 'Discuss',
    'version': '1.1',
    'category': 'Productivity/Discuss',
    'sequence': 145,
    'summary': 'Chat, mail gateway and private channels',
    'description': "",
    'website': 'https://www.odoo.com/page/discuss',
    'depends': ['base', 'base_setup', 'bus', 'web_tour'],
    'data': [
        'views/assets.xml',
        'views/mail_menus.xml',
        'wizard/invite_view.xml',
        'wizard/mail_blacklist_remove_view.xml',
        'wizard/mail_compose_message_view.xml',
        'wizard/mail_resend_cancel_views.xml',
        'wizard/mail_resend_message_views.xml',
        'wizard/mail_template_preview_views.xml',
        'views/mail_message_subtype_views.xml',
        'views/mail_tracking_views.xml',
        'views/mail_notification_views.xml',
        'views/mail_message_views.xml',
        'views/mail_mail_views.xml',
        'views/mail_followers_views.xml',
        'views/mail_moderation_views.xml',
        'views/mail_channel_views.xml',
        'views/mail_shortcode_views.xml',
        'views/mail_activity_views.xml',
        'views/res_config_settings_views.xml',
        'data/ir_config_parameter_data.xml',
        'data/res_partner_data.xml',
        'data/mail_message_subtype_data.xml',
        'data/mail_templates.xml',
        'data/mail_channel_data.xml',
        'data/mail_activity_data.xml',
        'data/ir_cron_data.xml',
        'security/mail_security.xml',
        'security/ir.model.access.csv',
        'views/mail_alias_views.xml',
        'views/res_users_views.xml',
        'views/mail_template_views.xml',
        'views/ir_actions_views.xml',
        'views/ir_model_views.xml',
        'views/res_partner_views.xml',
        'views/mail_blacklist_views.xml',
    ],
    'demo': [
        'data/mail_channel_demo.xml',
    ],
    'installable': True,
    'application': True,
    'qweb': [
        'static/src/xml/activity.xml',
        'static/src/xml/activity_view.xml',
        'static/src/xml/composer.xml',
        'static/src/xml/many2one_avatar_user.xml',
        'static/src/xml/systray.xml',
        'static/src/xml/thread.xml',
        'static/src/xml/web_kanban_activity.xml',
        'static/src/xml/text_emojis.xml',

        'static/src/bugfix/bugfix.xml',
        'static/src/components/Activity/Activity.xml',
        'static/src/components/ActivityBox/ActivityBox.xml',
        'static/src/components/ActivityMarkDonePopover/ActivityMarkDonePopover.xml',
        'static/src/components/Attachment/Attachment.xml',
        'static/src/components/AttachmentBox/AttachmentBox.xml',
        'static/src/components/AttachmentDeleteConfirmDialog/AttachmentDeleteConfirmDialog.xml',
        'static/src/components/AttachmentList/AttachmentList.xml',
        'static/src/components/AttachmentViewer/AttachmentViewer.xml',
        'static/src/components/AutocompleteInput/AutocompleteInput.xml',
        'static/src/components/ChatWindow/ChatWindow.xml',
        'static/src/components/ChatWindowHeader/ChatWindowHeader.xml',
        'static/src/components/ChatWindowHiddenMenu/ChatWindowHiddenMenu.xml',
        'static/src/components/ChatWindowManager/ChatWindowManager.xml',
        'static/src/components/Chatter/Chatter.xml',
        'static/src/components/ChatterContainer/ChatterContainer.xml',
        'static/src/components/ChatterTopbar/ChatterTopbar.xml',
        'static/src/components/Composer/Composer.xml',
        'static/src/components/ComposerSuggestedRecipient/ComposerSuggestedRecipient.xml',
        'static/src/components/ComposerSuggestedRecipientList/ComposerSuggestedRecipientList.xml',
        'static/src/components/ComposerSuggestion/ComposerSuggestion.xml',
        'static/src/components/ComposerSuggestionList/ComposerSuggestionList.xml',
        'static/src/components/composerTextInput/composerTextInput.xml',
        'static/src/components/Dialog/Dialog.xml',
        'static/src/components/DialogManager/DialogManager.xml',
        'static/src/components/Discuss/Discuss.xml',
        'static/src/components/DiscussMobileMailboxSelection/DiscussMobileMailboxSelection.xml',
        'static/src/components/DiscussSidebar/DiscussSidebar.xml',
        'static/src/components/DiscussSidebarItem/DiscussSidebarItem.xml',
        'static/src/components/DropZone/DropZone.xml',
        'static/src/components/EditableText/EditableText.xml',
        'static/src/components/EmojisPopover/EmojisPopover.xml',
        'static/src/components/FileUploader/FileUploader.xml',
        'static/src/components/FollowButton/FollowButton.xml',
        'static/src/components/Follower/Follower.xml',
        'static/src/components/FollowerListMenu/FollowerListMenu.xml',
        'static/src/components/FollowerSubtype/FollowerSubtype.xml',
        'static/src/components/FollowerSubtypeList/FollowerSubtypeList.xml',
        'static/src/components/MailTemplate/MailTemplate.xml',
        'static/src/components/Message/Message.xml',
        'static/src/components/MessageAuthorPrefix/MessageAuthorPrefix.xml',
        'static/src/components/MessageList/MessageList.xml',
        'static/src/components/MessageSeenIndicator/MessageSeenIndicator.xml',
        'static/src/components/MessagingMenu/MessagingMenu.xml',
        'static/src/components/MobileMessagingNavbar/MobileMessagingNavbar.xml',
        'static/src/components/ModerationBanDialog/ModerationBanDialog.xml',
        'static/src/components/ModerationDiscardDialog/ModerationDiscardDialog.xml',
        'static/src/components/ModerationRejectDialog/ModerationRejectDialog.xml',
        'static/src/components/NotificationAlert/NotificationAlert.xml',
        'static/src/components/NotificationGroup/NotificationGroup.xml',
        'static/src/components/NotificationList/NotificationList.xml',
        'static/src/components/NotificationPopover/NotificationPopover.xml',
        'static/src/components/NotificationRequest/NotificationRequest.xml',
        'static/src/components/PartnerImStatusIcon/PartnerImStatusIcon.xml',
        'static/src/components/ThreadIcon/ThreadIcon.xml',
        'static/src/components/ThreadNeedactionPreview/ThreadNeedactionPreview.xml',
        'static/src/components/ThreadPreview/ThreadPreview.xml',
        'static/src/components/ThreadTextualTypingStatus/ThreadTextualTypingStatus.xml',
        'static/src/components/ThreadTypingIcon/ThreadTypingIcon.xml',
        'static/src/components/ThreadView/ThreadView.xml',
        'static/src/widgets/common.xml',
        'static/src/widgets/Discuss/Discuss.xml',
        'static/src/widgets/DiscussInvitePartnerDialog/DiscussInvitePartnerDialog.xml',
        'static/src/widgets/MessagingMenu/MessagingMenu.xml',
    ],
}
