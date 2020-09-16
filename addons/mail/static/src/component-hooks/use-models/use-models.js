odoo.define('mail/static/src/component-hooks/use-models/use-models.js', function (require) {
'use strict';

require('mail/static/src/js/main.js'); // need model manager to be created

const { Component } = owl;
const { useStore } = owl.hooks;

async function useModels() {
    const component = Component.current;
    const env = component.env;
    /**
     * 1. Extend self attributes with use of models.
     */
    Object.assign(component, {
        localId: _.uniqueId(`${component.constructor.name}_`),
        mself: component, // used to have reference in template
    });
    /**
     * 2. Register itself as model observer.
     */
    const observer = env.invoke('Component/register', component);
    /**
     * 3. Observe changes using store (re-render if necessary)
     */
    useStore(() => observer.rev);
    /**
     * 4. On destroy: unregister itself as model observer.
     */
    const __destroy = component.__destroy;
    component.__destroy = parent => {
        __destroy.call(component, parent);
        // after actual call to __destroy because `willUnmount()` hook is called
        // by call to __destroy and can have read on models in `willUnmount()`.
        env.invoke('Component/unregister', component);
    };
}

return useModels;

});
