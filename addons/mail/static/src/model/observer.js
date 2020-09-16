odoo.define('mail/static/src/model/observer.js', function (require) {
'use strict';

class Observer {

    /**
     * @param {web.env} env
     * @param {owl.Component|field} ctx
     */
    constructor(env, ctx) {
        this.env = env;
        this.localId = ctx.localId;
        this.observees = new Set();
        this.rev = 0;
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @param {Observee} observee
     */
    addObservee(observee) {
        this.observees.add(observee.localId);
    }

    /**
     * @param {Observee} observee
     */
    removeObservee(observee) {
        this.observees.delete(observee.localId);
    }
}

return Observer;

});
