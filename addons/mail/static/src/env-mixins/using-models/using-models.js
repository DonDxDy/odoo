odoo.define('mail/static/src/env-mixins/using-models/using-models.js', function (require) {
'use strict';

const ModelManager = require('mail/static/src/model/model-manager.js');
const { makeDeferred } = require('mail/static/src/utils/deferred/deferred.js');

const { Store } = owl;
const { EventBus } = owl.core;

/**
 * @private
 * @param {web.env} env
 * @param {Object} options
 * @param {function} [options.beforeGenerateModels]
 */
async function _prepare(env, options) {
    if (options.beforeGenerateModels !== undefined) {
        await options.beforeGenerateModels();
    }
    env.invoke('init/start');
    env.messaging = env.invoke('Messaging/create');
    env.messagingCreated.resolve();
    await env.invoke('Messaging/start',
        env.messaging
    );
    env.messagingInitialized.resolve();
}

/**
 * @param {web.env} env
 * @param {Object} [options={}]
 * @param {boolean} [options.autofetchPartnerImStatus]
 * @param {function} [options.beforeGenerateModels]
 * @param {Object} [options.browser]
 * @param {boolean} [options.disableAnimation]
 * @param {boolean} [options.isQUnitTest]
 * @param {integer} [options.loadingBaseDelayDuration]
 * @returns {env}
 */
function usingModels(env, options = {}) {
    /**
     * Messaging store
     */
    const store = new Store({
        env,
        state: { rev: 0 },
    });
    /**
     * Environment keys used in messaging.
     */
    Object.assign(env, {
        autofetchPartnerImStatus: options.autofetchPartnerImStatus !== undefined
            ? options.autofetchPartnerImStatus
            : true,
        browser: options.browser !== undefined
            ? options.browser
            : env.browser,
        disableAnimation: options.disableAnimation !== undefined
            ? options.disableAnimation
            : false,
        invoke(actionName, ...args) {
            return env.modelManager.invoke(actionName, ...args);
        },
        isMessagingInitialized() {
            if (!this.messaging) {
                return false;
            }
            return this.messaging.$$$isInitialized();
        },
        /**
         * States whether the environment is in QUnit test or not.
         *
         * Useful to prevent some behaviour in QUnit tests, like applying
         * style of attachment that uses url.
         */
        isQUnitTest: options.isQUnitTest !== undefined
            ? options.isQUnitTest
            : false,
        loadingBaseDelayDuration: options.loadingBaseDelayDuration !== undefined
            ? options.loadingBaseDelayDuration
            : 400,
        messaging: undefined,
        messagingBus: new EventBus(),
        /**
         * Promise which becomes resolved when messaging is created.
         *
         * Useful for discuss widget to know when messaging is created, because this
         * is an essential condition to make it work.
         */
        messagingCreated: makeDeferred(),
        messagingInitialized: makeDeferred(),
        modelManager: new ModelManager(env),
        store,
    });
    /**
     * Components cannot use web.bus, because they cannot use
     * EventDispatcherMixin, and webclient cannot easily access env.
     * Communication between webclient and components by core.bus
     * (usable by webclient) and messagingBus (usable by components), which
     * the messaging service acts as mediator since it can easily use both
     * kinds of buses.
     */
    env.bus.on(
        'hide_home_menu',
        null,
        () => env.messagingBus.trigger('hide_home_menu')
    );
    env.bus.on(
        'show_home_menu',
        null,
        () => env.messagingBus.trigger('show_home_menu')
    );
    env.bus.on(
        'will_hide_home_menu',
        null,
        () => env.messagingBus.trigger('will_hide_home_menu')
    );
    env.bus.on(
        'will_show_home_menu',
        null,
        () => env.messagingBus.trigger('will_show_home_menu')
    );
    /**
     * Prepare for setup of models and messaging singleton record.
     * Could be delayed if needs to parse some other JS files before-hand,
     * hence not setup synchronously.
     */
    _prepare(env, options);
    return env;
}


return usingModels;

});
