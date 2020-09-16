odoo.define('mail/static/src/js/main.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/env-mixins/using-models/using-models.js');

const env = require('web.commonEnv');

usingModels(env, {
    async beforeGenerateModels() {
        await new Promise(resolve => {
            /**
             * Called when all JS resources are loaded. This is useful in order
             * to do some processing after other JS files have been parsed, for
             * example new models or patched models that are coming from
             * other modules, because some of those patches might need to be
             * applied before messaging initialization.
             */
            window.addEventListener('load', resolve);
        });
        /**
         * All JS resources are loaded, but not necessarily processed.
         * We assume no messaging-related modules return any Promise,
         * therefore they should be processed *at most* asynchronously at
         * "Promise time".
         */
        await new Promise(resolve => setTimeout(resolve));
        /**
         * Some models require session data, like locale text direction (depends on
         * fully loaded translation).
         */
        await env.session.is_bound;
    }
});

});
