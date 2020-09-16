odoo.define('mail/static/src/model/action.js', function (require) {
'use strict';

class Action {
    /**
     * @param {web.env} env
     * @param {string} name
     * @param {function} func
     */
    constructor(env, name, func) {
        this.env = env;
        this.func = func.bind({
            env: this.env,
            __action__: this,
        });
        this.name = name;
    }

    /**
     * @param {...any} args
     */
    call(...args) {
        return this.func(...args);
    }
}

return Action;

});
