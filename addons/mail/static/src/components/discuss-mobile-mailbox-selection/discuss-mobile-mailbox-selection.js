odoo.define('mail/static/src/components/discuss-mobile-mailbox-selection/discuss-mobile-mailbox-selection.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component } = owl;

class DiscussMobileMailboxSelection extends usingModels(Component) {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {Thread[]}
     */
    get orderedMailboxes() {
        return this.env.invoke('Thread/all',
                thread => (
                    thread.$$$isPinned(this) &&
                    thread.$$$model(this) === 'mail.box'
                )
            )
            .sort(
                (mailbox1, mailbox2) => {
                    if (mailbox1 === this.env.messaging.$$$inbox(this)) {
                        return -1;
                    }
                    if (mailbox2 === this.env.messaging.$$$inbox(this)) {
                        return 1;
                    }
                    if (mailbox1 === this.env.messaging.$$$starred(this)) {
                        return -1;
                    }
                    if (mailbox2 === this.env.messaging.$$$starred(this)) {
                        return 1;
                    }
                    const mailbox1Name = mailbox1.$$$displayName(this);
                    const mailbox2Name = mailbox2.$$$displayName(this);
                    mailbox1Name < mailbox2Name ? -1 : 1;
                }
            );
    }

    /**
     * @returns {Discuss}
     */
    get discuss() {
        return this.env.messaging && this.env.messaging.$$$discuss(this);
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when clicking on a mailbox selection item.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClick(ev) {
        const { mailboxLocalId } = ev.currentTarget.dataset;
        const mailbox = this.env.invoke('Record/get', mailboxLocalId);
        if (!mailbox) {
            return;
        }
        this.env.invoke('Thread/open', mailbox);
    }

}

Object.assign(DiscussMobileMailboxSelection, {
    props: {},
    template: 'mail.DiscussMobileMailboxSelection',
});

return DiscussMobileMailboxSelection;

});
