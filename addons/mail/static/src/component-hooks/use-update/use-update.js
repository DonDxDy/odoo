odoo.define('mail/static/src/component-hooks/useUpdate/useUpdate.js', function (require) {
'use strict';

const { onMounted, onPatched } = owl.hooks;

    /**
 * This hook provides support for executing code after update (render or patch).
 *
 * @param {Object} param0
 * @param {function} param0.func the function to execute after the update.
 */
function useUpdate({ func }) {
    onMounted(func);
    onPatched(func);
}

return useUpdate;

});