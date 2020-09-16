odoo.define('mail/static/src/models/activity/activity.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/clear': clear,
    'Field/insert': insert,
    'Field/link': link,
    'Field/many2many': many2many,
    'Field/many2one': many2one,
    'Field/unlink': unlink,
    'Field/unlinkAll': unlinkAll,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} _
     * @param {Object} data
     * @return {Object}
     */
    'Activity/convertData'(
        _,
        data
    ) {
        const data2 = {};
        if ('activity_category' in data) {
            data2.$$$category = data.activity_category;
        }
        if ('can_write' in data) {
            data2.$$$canWrite = data.can_write;
        }
        if ('create_data' in data) {
            data2.$$$dateCreate = data.create_date;
        }
        if ('date_deadline' in data) {
            data2.$$$dateDeadline = data.date_deadline;
        }
        if ('force_next' in data) {
            data2.$$$forceNext = data.force_next;
        }
        if ('icon' in data) {
            data2.$$$icon = data.icon;
        }
        if ('id' in data) {
            data2.$$$id = data.id;
        }
        if ('note' in data) {
            data2.$$$note = data.note;
        }
        if ('state' in data) {
            data2.$$$state = data.state;
        }
        if ('summary' in data) {
            data2.$$$summary = data.summary;
        }
        // relation
        if ('activity_type_id' in data) {
            if (!data.activity_type_id) {
                data2.$$$type = unlinkAll();
            } else {
                data2.$$$type = insert({
                    $$$displayName: data.activity_type_id[1],
                    $$$id: data.activity_type_id[0],
                });
            }
        }
        if ('create_uid' in data) {
            if (!data.create_uid) {
                data2.$$$creator = unlinkAll();
            } else {
                data2.$$$creator = insert({
                    $$$displayName: data.create_uid[1],
                    $$$id: data.create_uid[0],
                });
            }
        }
        if ('mail_template_ids' in data) {
            data2.$$$mailTemplates = insert({
                $$$id: data.mail_template_ids.id,
                $$$name: data.mail_template_ids.name,
            });
        }
        if ('res_id' in data && 'res_model' in data) {
            data2.$$$thread = insert({
                $$$id: data.res_id,
                $$$model: data.res_model,
            });
        }
        if ('user_id' in data) {
            if (!data.user_id) {
                data2.$$$assignee = unlinkAll();
            } else {
                data2.$$$assignee = insert({
                    $$$displayName: data.user_id[1],
                    $$$id: data.user_id[0],
                });
            }
        }
        if ('request_partner_id' in data) {
            if (!data.request_partner_id) {
                data2.$$$requestingPartner = unlink();
            } else {
                data2.$$$requestingPartner = insert({
                    $$$displayName: data.request_partner_id[1],
                    $$$id: data.request_partner_id[0],
                });
            }
        }
        return data2;
    },
    /**
     * Delete the record from database and locally.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Activity} activity
     */
    async 'Activity/deleteServerRecord'(
        { env },
        activity
    ) {
        await env.invoke(
            'Record/doAsync',
            activity,
            () => env.services.rpc({
                model: 'mail.activity',
                method: 'unlink',
                args: [[activity.$$$id()]],
            })
        );
        env.invoke('Record/delete', activity);
    },
    /**
     * Opens (legacy) form view dialog to edit current activity and updates
     * the activity when dialog is closed.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Activity} activity
     */
    'Activity/edit'(
        { env },
        activity
    ) {
        const action = {
            type: 'ir.actions.act_window',
            name: env._t("Schedule Activity"),
            res_model: 'mail.activity',
            view_mode: 'form',
            views: [[false, 'form']],
            target: 'new',
            context: {
                default_res_id: activity.$$$thread(this).$$$id(this),
                default_res_model: activity.$$$thread(this).$$$model(this),
            },
            res_id: activity.$$$id(this),
        };
        env.bus.trigger('do-action', {
            action,
            options: {
                on_close: () => env.invoke('Activity/fetchAndUpdate', activity),
            },
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Activity} activity
     */
    async 'Activity/fetchAndUpdate'(
        { env },
        activity
    ) {
        const [data] = await env.invoke(
            'Record/doAsync',
            activity,
            () => env.services.rpc({
                model: 'mail.activity',
                method: 'activity_format',
                args: [activity.$$$id(this)],
            }, { shadow: true })
        );
        let shouldDelete = false;
        if (data) {
            env.invoke(
                'Record/update',
                activity,
                env.invoke('Activity/convertData', data)
            );
        } else {
            shouldDelete = true;
        }
        env.invoke(
            'Thread/refreshActivities',
            activity.$$$thread(this)
        );
        env.invoke(
            'Thread/refresh',
            activity.$$$thread(this)
        );
        if (shouldDelete) {
            env.invoke('Record/delete', activity);
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Activity} activity
     * @param {Object} param2
     * @param {Attachment[]} [param2.attachments=[]]
     * @param {string|boolean} [param2.feedback=false]
     */
    async 'Activity/markAsDone'(
        { env },
        activity,
        {
            attachments = [],
            feedback = false,
        }
    ) {
        const attachmentIds = attachments.map(attachment => attachment.$$$id(this));
        await env.invoke(
            'Record/doAsync',
            activity,
            () => env.services.rpc({
                model: 'mail.activity',
                method: 'action_feedback',
                args: [[activity.$$$id(this)]],
                kwargs: {
                    attachment_ids: attachmentIds,
                    feedback,
                },
            })
        );
        env.invoke('Thread/refresh', activity.$$$thread(this));
        env.invoke('Record/delete', activity);
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Activity} activity
     * @param {Object} param2
     * @param {string} param2.feedback
     * @returns {Object}
     */
    async 'Activity/markAsDoneAndScheduleNext'(
        { env },
        activity,
        { feedback }
    ) {
        const action = await env.invoke(
            'Record/doAsync',
            activity,
            () => env.services.rpc({
                model: 'mail.activity',
                method: 'action_feedback_schedule_next',
                args: [[activity.$$$id(this)]],
                kwargs: { feedback },
            })
        );
        env.invoke('Thread/refresh', activity.$$$thread(this));
        const thread = activity.$$$thread(this);
        env.invoke('Record/delete', activity);
        if (!action) {
            env.invoke('Thread/refreshActivities', thread);
            return;
        }
        env.bus.trigger('do-action', {
            action,
            options: {
                on_close: () => {
                    env.invoke('Thread/refreshActivities', thread);
                },
            },
        });
    },
});

const model = defineModel({
    name: 'Activity',
    fields: {
        $$$assignee: many2one('User'),
        $$$assigneePartner: many2one('Partner', {
            related: '$$$assignee.$$$partner',
        }),
        $$$attachments: many2many('Attachment', {
            inverse: '$$$activities',
        }),
        $$$canWrite: attr({
            default: false,
        }),
        $$$category: attr(),
        $$$creator: many2one('User'),
        $$$dateCreate: attr(),
        $$$dateDeadline: attr(),
        $$$forceNext: attr({
            default: false,
        }),
        $$$icon: attr(),
        $$$id: attr({
            id: true,
        }),
        $$$isCurrentPartnerAssignee: attr({
            /**
             * @param {Object} param0
             * @param {Activity} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (
                    !record.$$$assigneePartner(this) ||
                    !record.$$$messagingCurrentPartner(this)
                ) {
                    return false;
                }
                return (
                    record.$$$assigneePartner(this) ===
                    record.$$$messagingCurrentPartner(this)
                );
            },
            default: false,
        }),
        $$$mailTemplates: many2many('MailTemplate', {
            inverse: '$$$activities',
        }),
        $$$messaging: many2one('Messaging', {
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @returns {Messaging}
             */
            compute({ env }) {
                return link(env.messaging);
            },
        }),
        $$$messagingCurrentPartner: many2one('Partner', {
            related: '$$$messaging.$$$currentPartner',
        }),
        /**
         * This value is meant to be returned by the server
         * (and has been sanitized before stored into db).
         * Do not use this value in a 't-raw' if the activity has been created
         * directly from user input and not from server data as it's not escaped.
         */
        $$$note: attr({
            /**
             * Wysiwyg editor put `<p><br></p>` even without a note on the activity.
             * This compute replaces this almost empty value by an actual empty
             * value, to reduce the size the empty note takes on the UI.
             *
             * @param {Object} param0
             * @param {Activity} param0.record
             * @returns {string|undefined}
             */
            compute({ record }) {
                if (record.$$$note(this) === '<p><br></p>') {
                    return clear();
                }
                return record.$$$note(this);
            },
        }),
        /**
         * Determines that an activity is linked to a requesting partner or not.
         * It will be used notably in website slides to know who triggered the
         * "request access" activity.
         * Also, be useful when the assigned user is different from the
         * "source" or "requesting" partner.
         */
        $$$requestingPartner: many2one('Partner'),
        $$$state: attr(),
        $$$summary: attr(),
        /**
         * Determines to which "thread" (using `mail.activity.mixin` on the
         * server) `this` belongs to.
         */
        $$$thread: many2one('Thread', {
            inverse: '$$$activities',
        }),
        $$$type: many2one('ActivityType', {
            inverse: '$$$activities',
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/activity/activity.js',
    actions,
    model,
);

});
