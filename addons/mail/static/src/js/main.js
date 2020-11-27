odoo.define('mail/static/src/js/main.js', function (require) {
'use strict';

const ModelManager = require('mail/static/src/model/model_manager.js');

const env = require('web.commonEnv');

const { Store } = owl;
const { EventBus } = owl.core;

function debugOwl(t,e){let n,o="[OWL_DEBUG]";function r(t){let e;try{e=JSON.stringify(t||{})}catch(t){e="<JSON error>"}return e.length>200&&(e=e.slice(0,200)+"..."),e}if(Object.defineProperty(t.Component,"current",{get:()=>n,set(s){n=s;const i=s.constructor.name;if(e.componentBlackList&&e.componentBlackList.test(i))return;if(e.componentWhiteList&&!e.componentWhiteList.test(i))return;let l;Object.defineProperty(n,"__owl__",{get:()=>l,set(n){!function(n,s,i){let l=`${s}<id=${i}>`,c=t=>console.log(`${o} ${l} ${t}`),u=t=>(!e.methodBlackList||!e.methodBlackList.includes(t))&&!(e.methodWhiteList&&!e.methodWhiteList.includes(t));u("constructor")&&c(`constructor, props=${r(n.props)}`);u("willStart")&&t.hooks.onWillStart(()=>{c("willStart")});u("mounted")&&t.hooks.onMounted(()=>{c("mounted")});u("willUpdateProps")&&t.hooks.onWillUpdateProps(t=>{c(`willUpdateProps, nextprops=${r(t)}`)});u("willPatch")&&t.hooks.onWillPatch(()=>{c("willPatch")});u("patched")&&t.hooks.onPatched(()=>{c("patched")});u("willUnmount")&&t.hooks.onWillUnmount(()=>{c("willUnmount")});const d=n.__render.bind(n);n.__render=function(...t){c("rendering template"),d(...t)};const h=n.render.bind(n);n.render=function(...t){const e=n.__owl__;let o="render";return e.isMounted||e.currentFiber||(o+=" (warning: component is not mounted, this render has no effect)"),c(o),h(...t)};const p=n.mount.bind(n);n.mount=function(...t){return c("mount"),p(...t)}}(s,i,(l=n).id)}})}}),e.logScheduler){let e=t.Component.scheduler.start,n=t.Component.scheduler.stop;t.Component.scheduler.start=function(){this.isRunning||console.log(`${o} scheduler: start running tasks queue`),e.call(this)},t.Component.scheduler.stop=function(){this.isRunning&&console.log(`${o} scheduler: stop running tasks queue`),n.call(this)}}if(e.logStore){let e=t.Store.prototype.dispatch;t.Store.prototype.dispatch=function(t,...n){return console.log(`${o} store: action '${t}' dispatched. Payload: '${r(n)}'`),e.call(this,t,...n)}}}
debugOwl(owl, {
  // componentBlackList: /App/,  // regexp
  // componentWhiteList: /Chatter/, // regexp
  // methodBlackList: ["mounted"], // list of method names
  // methodWhiteList: ["willStart"], // list of method names
  logScheduler: false,  // display/mute scheduler logs
  logStore: true,     // display/mute store logs
});

async function createMessaging() {
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

    env.modelManager.start();
    /**
     * Create the messaging singleton record.
     */
    env.messaging = env.models['mail.messaging'].create();
}

/**
 * Messaging store
 */
const store = new Store({
    env,
    state: {
        messagingRevNumber: 0,
    },
});

/**
 * Registry of models.
 */
env.models = {};
/**
 * Environment keys used in messaging.
 */
Object.assign(env, {
    autofetchPartnerImStatus: true,
    destroyMessaging() {
        if (env.modelManager) {
            env.modelManager.deleteAll();
            env.messaging = undefined;
        }
    },
    disableAnimation: false,
    isMessagingInitialized() {
        if (!this.messaging) {
            return false;
        }
        return this.messaging.isInitialized;
    },
    /**
     * States whether the environment is in QUnit test or not.
     *
     * Useful to prevent some behaviour in QUnit tests, like applying
     * style of attachment that uses url.
     */
    isQUnitTest: false,
    loadingBaseDelayDuration: 400,
    messaging: undefined,
    messagingBus: new EventBus(),
    /**
     * Promise which becomes resolved when messaging is created.
     *
     * Useful for discuss widget to know when messaging is created, because this
     * is an essential condition to make it work.
     */
    messagingCreatedPromise: createMessaging(),
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

env.messagingCreatedPromise.then(() => env.messaging.start());

});
