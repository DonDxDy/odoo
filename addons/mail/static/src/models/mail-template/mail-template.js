odoo.define('mail/static/src/models/mail-template/mail-template.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/many2many': many2many,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MailTemplate} mailTemplate
     * @param {Activity} activity
     */
    'MailTemplate/preview'(
        { env },
        mailTemplate,
        activity
    ) {
        const action = {
            name: env._t("Compose Email"),
            type: 'ir.actions.act_window',
            res_model: 'mail.compose.message',
            views: [[false, 'form']],
            target: 'new',
            context: {
                default_res_id: activity.$$$thread(this).$$$id(this),
                default_model: activity.$$$thread(this).$$$model(this),
                default_use_template: true,
                default_template_id: mailTemplate.$$$id(this),
                force_email: true,
            },
        };
        env.bus.trigger('do-action', {
            action,
            options: {
                on_close: () => {
                    env.invoke('Thread/refresh', activity.$$$thread(this));
                },
            },
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {MailTemplate} mailTemplate
     * @param {Activity} activity
     */
    async 'MailTemplate/send'(
        { env },
        mailTemplate,
        activity
    ) {
        await env.invoke(
            'Record/doAsync',
            mailTemplate,
            () => env.services.rpc({
                model: activity.$$$thread(this).$$$model(this),
                method: 'activity_send_mail',
                args: [
                    [activity.$$$thread(this).$$$id(this)],
                    mailTemplate.$$$id(this)
                ],
            })
        );
        env.invoke('Thread/refresh', activity.$$$thread(this));
    }
});

const model = defineModel({
    name: 'MailTemplate',
    fields: {
        $$$activities: many2many('Activity', {
            inverse: '$$$mailTemplates',
        }),
        $$$id: attr({
            id: true,
        }),
        $$$name: attr(),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/mail-template/mail-template.js',
    actions,
    model,
);

});
