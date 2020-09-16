odoo.define('hr/static/src/models/partner/partner.js', function (require) {
'use strict';

const {
    'Feature/defineActionExtensions': defineActionExtensions,
    'Feature/defineActions': defineActions,
    'Feature/defineModelExtension': defineModelExtension,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/one2one': one2one,
} = require('mail/static/src/model/utils.js');

const actionExtensions = defineActionExtensions({
    /**
     * When a partner is an employee, its employee profile contains more useful
     * information to know who he is than its partner profile.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {function} param0.original
     * @param {Partner} partner
     * @param {Object} options
     */
    async 'Activity/openProfile'(
        { env, original },
        partner,
        options
    ) {
        if (
            !partner.$$$employee(this) &&
            !partner.$$$hasCheckedEmployee(this)
        ) {
            await env.invoke(
                'Record/doAsync',
                partner,
                () => env.invoke('Partner/checkIsEmployee', partner)
            );
        }
        if (partner.$$$employee(this)) {
            return env.invoke(
                'Employee/openProfile',
                partner.$$$employee(this)
            );
        }
        return original(partner, options);
    },
});

const actions = defineActions({
    /**
     * Checks whether this partner has a related employee and links them if
     * applicable.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Partner} partner
     */
    async 'Partner/checkIsEmployee'(
        { env },
        partner
    ) {
        await env.invoke(
            'Record/doAsync',
            partner,
            () => env.invoke('Employee/performRpcSearchRead', {
                context: { active_test: false },
                domain: [['user_partner_id', '=', partner.$$$id(this)]],
                fields: ['user_id', 'user_partner_id'],
            })
        );
        env.invoke('Record/update', partner, {
            $$$hasCheckedEmployee: true,
        });
    },
});

const modelExtension = defineModelExtension({
    name: 'Partner',
    fields: {
        /**
         * Employee related to this partner. It is computed through
         * the inverse relation and should be considered read-only.
         */
        $$$employee: one2one('Employee', {
            inverse: '$$$partner',
        }),
        /**
         * Whether an attempt was already made to fetch the employee corresponding
         * to this partner. This prevents doing the same RPC multiple times.
         */
        $$$hasCheckedEmployee: attr({
            default: false,
        }),
    }
});

return defineFeatureSlice(
    'hr/static/src/models/partner/partner.js',
    actionExtensions,
    actions,
    modelExtension,
);

});
