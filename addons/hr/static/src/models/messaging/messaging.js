odoo.define('hr/static/src/models/messaging/messaging.js', function (require) {
'use strict';

const {
    'Feature/defineActionExtensions': defineActionExtensions,
    'Feature/defineSlice': defineFeatureSlice,
} = require('mail/static/src/model/utils.js');

const actionExtensions = defineActionExtensions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {function} param0.original
     * @param {Object} param1
     * @param {integer} [param1.employeeId]
     */
    async 'Messaging/getChat'(
        { env, original },
        { employeeId }
    ) {
        if (employeeId) {
            const employee = env.invoke('Employee/insert', {
                $$$id: employeeId,
            });
            return env.invoke('Employee/getChat', employee);
        }
        return original(...arguments);
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {function} param0.original
     * @param {Object} param1
     * @param {integer} param1.id
     * @param {string} param1.model
     */
    async 'Messaging/openProfile'(
        { env, original },
        {
            id,
            model,
        }
    ) {
        if (model === 'hr.employee' || model === 'hr.employee.public') {
            const employee = env.invoke('Employee/insert', {
                $$$id: id,
            });
            return env.invoke('Employee/openProfile', employee);
        }
        return original(...arguments);
    },
});

return defineFeatureSlice(
    'hr/static/src/models/messaging/messaging.js',
    actionExtensions,
);

});
