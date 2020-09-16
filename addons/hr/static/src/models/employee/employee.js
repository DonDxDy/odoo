odoo.define('hr/static/src/models/employee/employee.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/insert': insert,
    'Field/one2one': one2one,
    'Field/unlink': unlink,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * Checks whether this employee has a related user and partner and links
     * them if applicable.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Employee} employee
     * @returns {boolean}
     */
    async 'Employee/checkIsUser'(
        { env },
        employee
    ) {
        return env.invoke('Employee/performRpcRead', {
            context: { active_test: false },
            fields: [
                'user_id',
                'user_partner_id',
            ],
            ids: [employee.$$$id(this)],
        });
    },
    /**
     * @param {Object} _
     * @param {Object} data
     * @returns {Object}
     */
    'Employee/convertData'(
        _,
        data
    ) {
        const data2 = {};
        if ('id' in data) {
            data2.$$$id = data.id;
        }
        if ('user_id' in data) {
            data2.$$$hasCheckedUser = true;
            if (!data.user_id) {
                data2.$$$user = unlink();
            } else {
                const partnerNameGet = data.user_partner_id;
                const partnerData = {
                    $$$displayName: partnerNameGet[1],
                    $$$id: partnerNameGet[0],
                };
                const userNameGet = data.user_id;
                const userData = {
                    $$$displayName: userNameGet[1],
                    $$$id: userNameGet[0],
                    $$$partner: insert(partnerData),
                };
                data2.$$$user = insert(userData);
            }
        }
        return data2;
    },
    /**
     * Gets the chat between the user of this employee and the current user.
     *
     * If a chat is not appropriate, a notification is displayed instead.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Employee} employee
     * @returns {Thread|undefined}
     */
    async 'Employee/getChat'(
        { env },
        employee
    ) {
        if (!employee.$$$user(this) && !employee.$$$hasCheckedUser(this)) {
            await env.invoke(
                'Record/doAsync',
                employee,
                () => env.invoke('Employee/checkIsUser', employee)
            );
        }
        // prevent chatting with non-users
        if (!employee.$$$user(this)) {
            env.services['notification'].notify({
                message: env._t("You can only chat with employees that have a dedicated user."),
                type: 'info',
            });
            return;
        }
        return env.invoke('User/getChat', employee.$$$user(this));
    },
    /**
     * Opens a chat between the user of this employee and the current user
     * and returns it.
     *
     * If a chat is not appropriate, a notification is displayed instead.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Employee} employee
     * @param {Object} [options] forwarded to @see `Thread/open`
     * @returns {Thread|undefined}
     */
    async 'Employee/openChat'(
        { env },
        employee,
        options
    ) {
        const chat = await env.invoke(
            'Record/doAsync',
            employee,
            () => env.invoke('Employee/getChat', employee)
        );
        if (!chat) {
            return;
        }
        await env.invoke(
            'Record/doAsync',
            employee,
            () => env.invoke('Thread/open', chat, options)
        );
        return chat;
    },
    /**
     * Opens the most appropriate view that is a profile for this employee.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Employee} employee
     */
    async 'Employee/openProfile'(
        { env },
        employee
    ) {
        return env.invoke('Messaging/openDocument', {
            id: employee.$$$id(this),
            model: 'hr.employee.public',
        });
    },
    /**
     * Performs the `read` RPC on the `hr.employee.public`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {Object} param1.context
     * @param {string[]} param1.fields
     * @param {integer[]} param1.ids
     */
    async 'Employee/performRpcRead'(
        { env },
        {
            context,
            fields,
            ids,
        }
    ) {
        const dataList = await env.services.rpc({
            model: 'hr.employee.public',
            method: 'read',
            args: [ids],
            kwargs: {
                context,
                fields,
            },
        });
        env.invoke('Employee/insert',
            dataList.map(data => env.invoke('Employee/convertData', data))
        );
    },
    /**
     * Performs the `search_read` RPC on `hr.employee.public`.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Object} param1
     * @param {Object} param1.context
     * @param {Array[]} param1.domain
     * @param {string[]} param1.fields
     */
    async 'Employee/performRpcSearchRead'(
        { env },
        {
            context,
            domain,
            fields,
        }
    ) {
        const dataList = await env.services.rpc({
            model: 'hr.employee.public',
            method: 'search_read',
            kwargs: {
                context,
                domain,
                fields,
            },
        });
        env.invoke('Employee/insert',
            dataList.map(data => env.invoke('Employee/convertData', data))
        );
    },
});

const model = defineModel({
    name: 'Employee',
    fields: {
        /**
         * Whether an attempt was already made to fetch the user corresponding
         * to this employee. This prevents doing the same RPC multiple times.
         */
        $$$hasCheckedUser: attr({
            default: false,
        }),
        /**
         * Unique identifier for this employee.
         */
        $$$id: attr({
            id: true,
        }),
        /**
         * Partner related to this employee.
         */
        $$$partner: one2one('Partner', {
            inverse: '$$$employee',
            related: '$$$user.$$$partner',
        }),
        /**
         * User related to this employee.
         */
        $$$user: one2one('User', {
            inverse: '$$$employee',
        }),
    },
});

return defineFeatureSlice(
    'hr/static/src/models/employee/employee.js',
    actions,
    model,
);

});
