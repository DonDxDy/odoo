odoo.define('mail/static/src/model/core.js', function (require) {
'use strict';

/**
 * Module that contains registry for adding new models or patching models.
 * Useful for model manager in order to generate model classes.
 *
 * This code is not in model manager because other JS modules should populate
 * a registry, and it's difficult to ensure availability of the model manager
 * when these JS modules are deployed.
 */

/**
 * List of observers of the queue. Usually just the model manager.
 */
const observers = new Map();
/**
 * Queue of register method calls. Used by modelManager when available.
 *
 * Useful due to model manager not necessarily available when some JS modules
 * desire to register model and/or actions.
 */
const queue = [];

//------------------------------------------------------------------------------
// Private
//------------------------------------------------------------------------------

/**
 * @private
 * @param {...any} args
 */
function _insert(...args) {
    queue.push([...args]);
    _notify();
}

/**
 * @private
 */
function _notify() {
    for (const callback of observers.values()) {
        callback();
    }
}

//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------

/**
 * @param {any} observer
 * @param {function} callback
 */
function observe(observer, callback) {
    observers.set(observer, callback);
}

/**
 * @param {string} filename
 * @param {Object} actions
 */
function registerActions(...args) {
    _insert('registerActions', ...args);

    // for (const actionName in actions) {
    //     if (!registry.actions[actionName]) {
    //         registry.actions[actionName] = {
    //             original: undefined,
    //             extensions: [],
    //         };
    //     }
    //     if (registry.actions[actionName].original) {
    //         throw new Error(`2 actions cannot share same name "${
    //             actionName
    //         }". Conflicting filenames: "${
    //             filename
    //         }" & "${
    //             registry.actions[actionName].original.filename
    //         }."`);
    //     }
    //     registry.actions[actionName].original = {
    //         filename,
    //         func: actions[actionName],
    //     };
    // }
}

/**
 * @param {string} filename
 * @param {Object} actions
 */
function registerExtendedActions(...args) {
    _insert('registerExtendedActions', ...args);
    // for (const actionName in actions) {
    //     if (!registry.actions[actionName]) {
    //         registry.actions[actionName] = {
    //             original: undefined,
    //             extensions: [],
    //         };
    //     }
    //     registry.actions[actionName].extensions.push({
    //         filename,
    //         func: actions[actionName],
    //     });
    // }
}

/**
 * @param {string} filename
 * @param {string} modelName
 * @param {Object} fieldExtensions
 * @param {Object} [recordLifecycleOverrides]
 */
function registerExtendedModel(...args) {
    _insert('registerExtendedModel', ...args);
    // if (!registry.models[modelName]) {
    //     registry.models[modelName] = {
    //         original: undefined,
    //         extensions: [],
    //     };
    // }
    // registry.models[modelName].extensions.push({
    //     fieldExtensions,
    //     filename,
    //     recordLifecycleOverrides,
    // });
}

/**
 * @param {string} filename
 * @param {string} modelName
 * @param {Object} fields
 * @param {Object} [recordLifecycleOverrides]
 * @throws {Error} in case there's already a model registered with same name
 */
function registerModel(...args) {
    _insert('registerModel', ...args);
    // if (!registry.models[modelName]) {
    //     registry.models[modelName] = {
    //         original: undefined,
    //         extensions: [],
    //     };
    // }
    // if (registry.models[modelName].original) {
    //     throw new Error(`2 models cannot share same name "${
    //         modelName
    //     }". Conflicting filenames: "${
    //         filename
    //     }" & "${
    //         registry.models[modelName].original.filename
    //     }."`);
    // }
    // registry.models[modelName].original = {
    //     fields,
    //     filename,
    //     recordLifecycleOverrides,
    // };
}

/**
 * @param {any} observer
 */
function unobserve(observer) {
    observers.delete(observer);
}

//------------------------------------------------------------------------------
// Export
//------------------------------------------------------------------------------

return {
    addFeature,
    observe,
    queue,
    registerActions,
    registerExtendedActions,
    registerExtendedModel,
    removeFeature,
    registerModel,
    unobserve,
};

});
