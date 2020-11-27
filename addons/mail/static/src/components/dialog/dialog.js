odoo.define('mail/static/src/components/dialog/dialog.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component } = owl;
const { useRef } = owl.hooks;

class Dialog extends usingModels(Component) {

    /**
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);
        /**
         * Reference to the component used inside this dialog.
         */
        this._componentRef = useRef('component');
        this._onClickGlobal = this._onClickGlobal.bind(this);
        this._onKeydownDocument = this._onKeydownDocument.bind(this);
    }

    mounted() {
        document.addEventListener('click', this._onClickGlobal, true);
        document.addEventListener('keydown', this._onKeydownDocument);
    }

    willUnmount() {
        document.removeEventListener('click', this._onClickGlobal, true);
        document.removeEventListener('keydown', this._onKeydownDocument);
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when clicking on this dialog.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClick(ev) {
        ev.stopPropagation();
    }

    /**
     * Closes the dialog when clicking outside.
     * Does not work with attachment viewer because it takes the whole space.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickGlobal(ev) {
        if (this._componentRef.el && this._componentRef.el.contains(ev.target)) {
            return;
        }
        // TODO: this should be child logic (will crash if child doesn't have isCloseable!!)
        // task-2092965
        if (
            this._componentRef.comp &&
            this._componentRef.comp.isCloseable &&
            !this._componentRef.comp.isCloseable()
        ) {
            return;
        }
        this.env.invoke('Record/delete', this.dialog);
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeydownDocument(ev) {
        if (ev.key === 'Escape') {
            this.env.invoke('Record/delete', this.dialog);
        }
    }

}

Object.assign(Dialog, {
    props: {
        dialog: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Dialog') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.Dialog',
});

return Dialog;

});
