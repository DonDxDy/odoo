odoo.define('mail/static/src/components/message-seen-indicator/message-seen-indicator.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component } = owl;

class MessageSeenIndicator extends usingModels(Component) {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {string}
     */
    get indicatorTitle() {
        if (!this.messageSeenIndicator) {
            return '';
        }
        if (this.messageSeenIndicator.$$$hasEveryoneSeen(this)) {
            return this.env._t("Seen by Everyone");
        }
        if (this.messageSeenIndicator.$$$hasSomeoneSeen(this)) {
            const partnersThatHaveSeen =
                this.messageSeenIndicator.$$$partnersThatHaveSeen(this).map(
                    partner => partner.$$$name(this)
                );
            if (partnersThatHaveSeen.length === 1) {
                return _.str.sprintf(
                    this.env._t("Seen by %s"),
                    partnersThatHaveSeen[0]
                );
            }
            if (partnersThatHaveSeen.length === 2) {
                return _.str.sprintf(
                    this.env._t("Seen by %s and %s"),
                    partnersThatHaveSeen[0],
                    partnersThatHaveSeen[1]
                );
            }
            return _.str.sprintf(
                this.env._t("Seen by %s, %s and more"),
                partnersThatHaveSeen[0],
                partnersThatHaveSeen[1]
            );
        }
        if (this.messageSeenIndicator.$$$hasEveryoneFetched(this)) {
            return this.env._t("Received by Everyone");
        }
        if (this.messageSeenIndicator.$$$hasSomeoneFetched(this)) {
            const partnersThatHaveFetched =
                this.messageSeenIndicator.$$$partnersThatHaveFetched(this).map(
                    partner => partner.$$$name(this)
                );
            if (partnersThatHaveFetched.length === 1) {
                return _.str.sprintf(
                    this.env._t("Received by %s"),
                    partnersThatHaveFetched[0]
                );
            }
            if (partnersThatHaveFetched.length === 2) {
                return _.str.sprintf(
                    this.env._t("Received by %s and %s"),
                    partnersThatHaveFetched[0],
                    partnersThatHaveFetched[1]
                );
            }
            return _.str.sprintf(
                this.env._t("Received by %s, %s and more"),
                partnersThatHaveFetched[0],
                partnersThatHaveFetched[1]
            );
        }
        return '';
    }

    /**
     * @returns {MessageSeenIndicator}
     */
    get messageSeenIndicator() {
        return this.env.invoke('MessageSeenIndicator/find',
            seenIndicator => (
                seenIndicator.$$$message(this) === this.message &&
                seenIndicator.$$$thread(this) === this.thread
            )
        );
    }
}

Object.assign(MessageSeenIndicator, {
    props: {
        message: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Message') {
                    return false;
                }
                return true;
            },
        },
        thread: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Thread') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.MessageSeenIndicator',
});

return MessageSeenIndicator;

});
