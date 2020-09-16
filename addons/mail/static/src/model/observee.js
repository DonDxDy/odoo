odoo.define('mail/static/src/model/observee.js', function (require) {
'use strict';

class Observee {

    /**
     * @param {web.env} env
     * @param {Field} field
     */
    constructor(env, field) {
        this.env = env;
        this.localId = field.localId;
        this.observers = new Set();
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @param {Observer} observer
     */
    addObserver(observer) {
        this.observers.add(observer.localId);
    }

    /**
     * @returns {boolean}
     */
    hasObservers() {
        return (this.observers.size !== 0);
    }

    /**
     * @param {Observer} observer
     */
    removeObserver(observer) {
        this.observers.delete(observer.localId);
    }

}

return Observee;

});
