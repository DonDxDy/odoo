# -*- coding: utf-8 -*-

{
    'name': 'Discuss',
    'version': '1.0',
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
        'data/mail_data.xml',
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
        'static/src/components/activity/activity.xml',
        'static/src/components/activity_box/activity_box.xml',
        'static/src/components/activity_mark_done_popover/activity_mark_done_popover.xml',
        'static/src/components/attachment/attachment.xml',
        'static/src/components/attachment_box/attachment_box.xml',
        'static/src/components/attachment_delete_confirm_dialog/attachment_delete_confirm_dialog.xml',
        'static/src/components/attachment_list/attachment_list.xml',
        'static/src/components/attachment_viewer/attachment_viewer.xml',
        'static/src/components/autocomplete_input/autocomplete_input.xml',
        'static/src/components/chat_window/chat_window.xml',
        'static/src/components/chat_window_header/chat_window_header.xml',
        'static/src/components/chat_window_hidden_menu/chat_window_hidden_menu.xml',
        'static/src/components/chat_window_manager/chat_window_manager.xml',
        'static/src/components/chatter/chatter.xml',
        'static/src/components/chatter_container/chatter_container.xml',
        'static/src/components/chatter_topbar/chatter_topbar.xml',
        'static/src/components/composer/composer.xml',
        'static/src/components/composer_suggested_recipient/composer_suggested_recipient.xml',
        'static/src/components/composer_suggested_recipient_list/composer_suggested_recipient_list.xml',
        'static/src/components/composer_suggestion/composer_suggestion.xml',
        'static/src/components/composer_suggestion_list/composer_suggestion_list.xml',
        'static/src/components/composer_text_input/composer_text_input.xml',
        'static/src/components/dialog/dialog.xml',
        'static/src/components/dialog_manager/dialog_manager.xml',
        'static/src/components/discuss/discuss.xml',
        'static/src/components/discuss_mobile_mailbox_selection/discuss_mobile_mailbox_selection.xml',
        'static/src/components/discuss_sidebar/discuss_sidebar.xml',
        'static/src/components/discuss_sidebar_item/discuss_sidebar_item.xml',
        'static/src/components/drop_zone/drop_zone.xml',
        'static/src/components/editable_text/editable_text.xml',
        'static/src/components/emojis_popover/emojis_popover.xml',
        'static/src/components/file_uploader/file_uploader.xml',
        'static/src/components/follow_button/follow_button.xml',
        'static/src/components/follower/follower.xml',
        'static/src/components/follower_list_menu/follower_list_menu.xml',
        'static/src/components/follower_subtype/follower_subtype.xml',
        'static/src/components/follower_subtype_list/follower_subtype_list.xml',
        'static/src/components/mail_template/mail_template.xml',
        'static/src/components/message/message.xml',
        'static/src/components/message_actions/message_actions.xml',
        'static/src/components/message_author_prefix/message_author_prefix.xml',
        'static/src/components/message_delete_confirm_dialog/message_delete_confirm_dialog.xml',
        'static/src/components/message_list/message_list.xml',
        'static/src/components/message_seen_indicator/message_seen_indicator.xml',
        'static/src/components/messaging_menu/messaging_menu.xml',
        'static/src/components/mobile_messaging_navbar/mobile_messaging_navbar.xml',
        'static/src/components/moderation_ban_dialog/moderation_ban_dialog.xml',
        'static/src/components/moderation_discard_dialog/moderation_discard_dialog.xml',
        'static/src/components/moderation_reject_dialog/moderation_reject_dialog.xml',
        'static/src/components/notification_alert/notification_alert.xml',
        'static/src/components/notification_group/notification_group.xml',
        'static/src/components/notification_list/notification_list.xml',
        'static/src/components/notification_popover/notification_popover.xml',
        'static/src/components/notification_request/notification_request.xml',
        'static/src/components/partner_im_status_icon/partner_im_status_icon.xml',
        'static/src/components/thread_icon/thread_icon.xml',
        'static/src/components/thread_needaction_preview/thread_needaction_preview.xml',
        'static/src/components/thread_preview/thread_preview.xml',
        'static/src/components/thread_textual_typing_status/thread_textual_typing_status.xml',
        'static/src/components/thread_typing_icon/thread_typing_icon.xml',
        'static/src/components/thread_view/thread_view.xml',
        'static/src/widgets/common.xml',
        'static/src/widgets/discuss/discuss.xml',
        'static/src/widgets/discuss_invite_partner_dialog/discuss_invite_partner_dialog.xml',
        'static/src/widgets/messaging_menu/messaging_menu.xml',
    ],
}
