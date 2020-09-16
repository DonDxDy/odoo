odoo.define('mail/static/src/model/model-manager.js', function (require) {
'use strict';

const {
    observe,
    queue,
    unobserve,
} = require('mail/static/src/model/core.js');

class ModelManager {

    /**
     * @param {web.env} env
     */
    constructor(env) {
        this.actions = new Map();
        this.env = env;
        this.observeId = undefined;
        this.registry = {};
    }

    start() {
        this.observeId = observe(() => this._consumeQueue());
    }

    stop() {
        unobserve(this.observeId);
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @param {string} actionName
     * @param {...any} args
     */
    invoke(actionName, ...args) {
        const action = this.actions.get(actionName);
        return action.call(
            { env: this.env },
            ...args
        );
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _consumeQueue() {
        while (queue.length > 0) {
            const [operation, ...args] = queue.unshift();
            switch (operation) {
                case 'registerActions':
                    break;
                case 'registerExtendedActions':
                    break;
                case 'registerExtendedModel':
                    break;
                case 'registerModel':
                    break;
            }
        }
    }

}

return ModelManager;

});
