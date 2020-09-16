odoo.define('mail/static/src/components/chatter/chatter.js', function (require) {
'use strict';

const useUpdate = require('mail/static/src/component-hooks/use-update/use-update.js');
const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;
const { useRef } = owl.hooks;

class Chatter extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        useUpdate({ func: () => this._update() });
        /**
         * Reference of the composer. Useful to focus it.
         */
        this._composerRef = useRef('composer');
        /**
         * Reference of the message list. Useful to trigger the scroll event on it.
         */
        this._threadRef = useRef('thread');
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _notifyRendered() {
        this.trigger('o-chatter-rendered', {
            attachments: this.chatter.$$$thread(this).$$$allAttachments(this),
            thread: this.chatter.$$$thread(this),
        });
    }

    /**
     * @private
     */
    _update() {
        if (!this.chatter) {
            return;
        }
        if (this.chatter.$$$thread(this)) {
            this._notifyRendered();
        }
        if (this.chatter.$$$isDoFocus(this)) {
            this.env.invoke('Record/update', this.chatter, { $$$isDoFocus: false });
            const composer = this._composerRef.comp;
            if (composer) {
                composer.focus();
            }
        }
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onComposerMessagePosted() {
        this.env.invoke('Record/update', this.chatter, {
            $$$isComposerVisible: false
        });
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onScrollPanelScroll(ev) {
        if (!this._threadRef.comp) {
            return;
        }
        this._threadRef.comp.onScroll(ev);
    }

}

Object.assign(Chatter, {
    props: {
        chatter: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Chatter') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.Chatter',
});

QWeb.registerComponent('Chatter', Chatter);

return Chatter;

});
