odoo.define('mail/static/src/components/message/message.js', function (require) {
'use strict';

const useUpdate = require('mail/static/src/component-hooks/use-update/use-update.js');
const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { _lt } = require('web.core');
const { getLangDatetimeFormat } = require('web.time');

const { Component, QWeb, useState } = owl;
const { useRef } = owl.hooks;

const READ_MORE = _lt("read more");
const READ_LESS = _lt("read less");
const {
    isEventHandled,
    markEventHandled,
} = require('mail/static/src/utils/utils.js');

class Message extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.state = useState({
            // Determine if the moderation ban dialog is displayed.
            hasModerationBanDialog: false,
            // Determine if the moderation discard dialog is displayed.
            hasModerationDiscardDialog: false,
            // Determine if the moderation reject dialog is displayed.
            hasModerationRejectDialog: false,
            /**
             * Determine whether the message is clicked. When message is in
             * clicked state, it keeps displaying the commands.
             */
            isClicked: false,
        });
        useUpdate({ func: () => this._update() });
        /**
         * The intent of the reply button depends on the last rendered state.
         */
        this._wasSelected;
        /**
         * Reference to the content of the message.
         */
        this._contentRef = useRef('content');
        /**
         * To get checkbox state.
         */
        this._checkboxRef = useRef('checkbox');
        /**
         * Id of setInterval used to auto-update time elapsed of message at
         * regular time.
         */
        this._intervalId = undefined;
        this._constructor();
    }

    /**
     * Allows patching constructor.
     */
    _constructor() {}

    willUnmount() {
        clearInterval(this._intervalId);
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {string}
     */
    get avatar() {
        if (this.message.$$$author(this)) {
            // TODO FIXME for public user this might not be accessible. task-2223236
            // we should probably use the correspondig attachment id + access token
            // or create a dedicated route to get message image, checking the access right of the message
            return this.message.$$$author(this).$$$avatarUrl(this);
        } else if (this.message.$$$type(this) === 'email') {
            return '/mail/static/src/img/email_icon.png';
        }
        return '/mail/static/src/img/smiley/avatar.jpg';
    }

    /**
     * Get the date time of the message at current user locale time.
     *
     * @returns {string}
     */
    get datetime() {
        return this.message.$$$date(this).format(getLangDatetimeFormat());
    }

    /**
     * Determines whether author open chat feature is enabled on message.
     *
     * @returns {boolean}
     */
    get hasAuthorOpenChat() {
        if (!this.message.$$$author(this)) {
            return false;
        }
        if (
            this.threadView &&
            this.threadView.$$$thread(this) &&
            (
                this.threadView.$$$thread(this).$$$correspondent(this) ===
                this.message.$$$author(this)
            )
        ) {
            return false;
        }
        return true;
    }

    /**
     * @returns {Attachment[]}
     */
    get imageAttachments() {
        return this.message.$$$attachments(this).filter(
            attachment => attachment.$$$fileType(this) === 'image'
        );
    }

    /**
     * Tell whether the bottom of this message is visible or not.
     *
     * @param {Object} param0
     * @param {integer} [offset=0]
     * @returns {boolean}
     */
    isBottomVisible({ offset = 0 } = {}) {
        if (!this.el) {
            return false;
        }
        const elRect = this.el.getBoundingClientRect();
        if (!this.el.parentNode) {
            return false;
        }
        const parentRect = this.el.parentNode.getBoundingClientRect();
        // bottom with (double) 10px offset
        return (
            elRect.bottom < parentRect.bottom + offset &&
            parentRect.top < elRect.bottom + offset
        );
    }

    /**
     * Tell whether the message is partially visible on browser window or not.
     *
     * @returns {boolean}
     */
    isPartiallyVisible() {
        const elRect = this.el.getBoundingClientRect();
        if (!this.el.parentNode) {
            return false;
        }
        const parentRect = this.el.parentNode.getBoundingClientRect();
        // intersection with 5px offset
        return (
            elRect.top < parentRect.bottom + 5 &&
            parentRect.top < elRect.bottom + 5
        );
    }

    /**
     * @returns {Attachment[]}
     */
    get nonImageAttachments() {
        return this.message.$$$attachments(this).filter(
            attachment => attachment.$$$fileType(this) !== 'image'
        );
    }

    /**
     * @returns {string}
     */
    get OPEN_CHAT() {
        return this.env._t("Open chat");
    }

    /**
     * Make this message viewable in its enclosing scroll environment (usually
     * message list).
     *
     * @param {Object} [param0={}]
     * @param {string} [param0.behavior='auto']
     * @param {string} [param0.block='end']
     * @returns {Promise}
     */
    async scrollIntoView({ behavior = 'auto', block = 'end' } = {}) {
        this.el.scrollIntoView({
            behavior,
            block,
            inline: 'nearest',
        });
        if (behavior === 'smooth') {
            return new Promise(resolve => setTimeout(resolve, 500));
        } else {
            return Promise.resolve();
        }
    }

    /**
     * Get the shorttime format of the message date.
     *
     * @returns {string}
     */
    get shortTime() {
        return this.message.$$$date(this).format('hh:mm');
    }

    /**
     * @returns {Object}
     */
    get trackingValues() {
        return this.message.$$$trackingValues(this).map(trackingValue => {
            const value = { ...trackingValue };
            value.changed_field = _.str.sprintf(this.env._t("%s:"), value.changed_field);
            if (value.field_type === 'datetime') {
                if (value.old_value) {
                    value.old_value =
                        moment.utc(value.old_value).local().format('LLL');
                }
                if (value.new_value) {
                    value.new_value =
                        moment.utc(value.new_value).local().format('LLL');
                }
            } else if (value.field_type === 'date') {
                if (value.old_value) {
                    value.old_value =
                        moment(value.old_value).local().format('LL');
                }
                if (value.new_value) {
                    value.new_value =
                        moment(value.new_value).local().format('LL');
                }
            }
            return value;
        });
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Modifies the message to add the 'read more/read less' functionality
     * All element nodes with 'data-o-mail-quote' attribute are concerned.
     * All text nodes after a ``#stopSpelling`` element are concerned.
     * Those text nodes need to be wrapped in a span (toggle functionality).
     * All consecutive elements are joined in one 'read more/read less'.
     *
     * FIXME This method should be rewritten (task-2308951)
     *
     * @private
     * @param {jQuery} $element
     */
    _insertReadMoreLess($element) {
        const groups = [];
        let readMoreNodes;

        // nodeType 1: element_node
        // nodeType 3: text_node
        const $children = $element.contents()
            .filter((index, content) =>
                content.nodeType === 1 || (content.nodeType === 3 && content.nodeValue.trim())
            );

        for (const child of $children) {
            let $child = $(child);

            // Hide Text nodes if "stopSpelling"
            if (
                child.nodeType === 3 &&
                $child.prevAll('[id*="stopSpelling"]').length > 0
            ) {
                // Convert Text nodes to Element nodes
                $child = $('<span>', {
                    text: child.textContent,
                    'data-o-mail-quote': '1',
                });
                child.parentNode.replaceChild($child[0], child);
            }

            // Create array for each 'read more' with nodes to toggle
            if (
                $child.attr('data-o-mail-quote') ||
                (
                    $child.get(0).nodeName === 'BR' &&
                    $child.prev('[data-o-mail-quote="1"]').length > 0
                )
            ) {
                if (!readMoreNodes) {
                    readMoreNodes = [];
                    groups.push(readMoreNodes);
                }
                $child.hide();
                readMoreNodes.push($child);
            } else {
                readMoreNodes = undefined;
                this._insertReadMoreLess($child);
            }
        }

        for (const group of groups) {
            // Insert link just before the first node
            const $readMoreLess = $('<a>', {
                class: 'o-Message-readMoreLess',
                href: '#',
                text: READ_MORE,
            }).insertBefore(group[0]);

            // Toggle All next nodes
            let isReadMore = true;
            $readMoreLess.click(e => {
                e.preventDefault();
                isReadMore = !isReadMore;
                for (const $child of group) {
                    $child.hide();
                    $child.toggle(!isReadMore);
                }
                $readMoreLess.text(isReadMore ? READ_MORE : READ_LESS);
            });
        }
    }

    /**
     * @private
     */
    _update() {
        if (!this.message) {
            return;
        }
        // Remove all readmore before if any before reinsert them with _insertReadMoreLess.
        // This is needed because _insertReadMoreLess is working with direct DOM mutations
        // which are not sync with Owl.
        if (this._contentRef.el) {
            for (const el of [...this._contentRef.el.querySelectorAll(':scope .o-Message-readMoreLess')]) {
                el.remove();
            }
            this._insertReadMoreLess($(this._contentRef.el));
            this.env.messagingBus.trigger('o-component-message-read-more-less-inserted', {
                message: this.message,
            });
        }
        this._wasSelected = this.isSelected;
        this.env.invoke('refreshDateFromNow', this.message);
        clearInterval(this._intervalId);
        this._intervalId = setInterval(() => {
            this.env.invoke('refreshDateFromNow', this.message);
        }, 60 * 1000);
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onChangeCheckbox() {
        this.env.invoke(
            'Message/toggleCheck',
            this.message,
            this.threadView.$$$thread(this),
            this.threadView.$$$stringifiedDomain(this)
        );
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClick(ev) {
        if (ev.target.closest('.o_channel_redirect')) {
            this.env.invoke('Messaging/openProfile',
                this.env.messaging,
                {
                    id: Number(ev.target.dataset.oeId),
                    model: 'mail.channel',
                }
            );
            // avoid following dummy href
            ev.preventDefault();
            return;
        }
        if (ev.target.tagName === 'A') {
            if (ev.target.dataset.oeId && ev.target.dataset.oeModel) {
                this.env.invoke('Messaging/openProfile',
                    this.env.messaging,
                    {
                        id: Number(ev.target.dataset.oeId),
                        model: ev.target.dataset.oeModel,
                    }
                );
                // avoid following dummy href
                ev.preventDefault();
            }
            return;
        }
        if (
            !isEventHandled(ev, 'Message.ClickAuthorAvatar') &&
            !isEventHandled(ev, 'Message.ClickAuthorName') &&
            !isEventHandled(ev, 'Message.ClickFailure')
        ) {
            this.state.isClicked = !this.state.isClicked;
        }
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickAuthorAvatar(ev) {
        markEventHandled(ev, 'Message.ClickAuthorAvatar');
        if (!this.hasAuthorOpenChat) {
            return;
        }
        this.env.invoke(
            'Partner/openChat',
            this.message.$$$author(this)
        );
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickAuthorName(ev) {
        markEventHandled(ev, 'Message.ClickAuthorName');
        if (!this.message.$$$author(this)) {
            return;
        }
        this.env.invoke(
            'Partner/openProfile',
            this.message.$$$author(this)
        );
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickFailure(ev) {
        markEventHandled(ev, 'Message.ClickFailure');
        this.env.invoke(
            'Message/openResendAction',
            this.message
        );
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickModerationAccept(ev) {
        ev.preventDefault();
        this.env.invoke(
            'Message/moderate',
            this.message,
            'accept'
        );
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickModerationAllow(ev) {
        ev.preventDefault();
        this.env.invoke('Message/moderate',
            this.message,
            'allow'
        );
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickModerationBan(ev) {
        ev.preventDefault();
        this.state.hasModerationBanDialog = true;
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickModerationDiscard(ev) {
        ev.preventDefault();
        this.state.hasModerationDiscardDialog = true;
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickModerationReject(ev) {
        ev.preventDefault();
        this.state.hasModerationRejectDialog = true;
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickOriginThread(ev) {
        // avoid following dummy href
        ev.preventDefault();
        this.env.invoke('Message/markAsRead', this.message);
        this.env.invoke(
            'Thread/open',
            this.message.$$$originThread(this)
        );
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickStar(ev) {
        ev.stopPropagation();
        this.env.invoke(
            'Message/toggleStar',
            this.message
        );
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickMarkAsRead(ev) {
        ev.stopPropagation();
        this.env.invoke(
            'Message/markAsRead',
            this.message
        );
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickReply(ev) {
        // Use this._wasSelected because this.isSelected might be changed
        // by a global capture click handler (for example the one from Composer)
        // before the current handler is executed. Indeed because it does a
        // toggle it needs to take into account the value before the click.
        if (this._wasSelected) {
            this.env.invoke(
                'Discuss/clearReplyingToMessage',
                this.env.messaging.$$$discuss(this)
            );
        } else {
            this.env.invoke(
                'Message/replyTo',
                this.message
            );
        }
    }

    /**
     * @private
     */
    _onDialogClosedModerationBan() {
        this.state.hasModerationBanDialog = false;
    }

    /**
     * @private
     */
    _onDialogClosedModerationDiscard() {
        this.state.hasModerationDiscardDialog = false;
    }

    /**
     * @private
     */
    _onDialogClosedModerationReject() {
        this.state.hasModerationRejectDialog = false;
    }

}

Object.assign(Message, {
    defaultProps: {
        hasCheckbox: false,
        hasMarkAsReadIcon: false,
        hasReplyIcon: false,
        isSelected: false,
        isSquashed: false,
    },
    props: {
        attachmentsDetailsMode: {
            type: String,
            optional: true,
            validate: prop => ['auto', 'card', 'hover', 'none'].includes(prop),
        },
        hasCheckbox: Boolean,
        hasMarkAsReadIcon: Boolean,
        hasReplyIcon: Boolean,
        isSelected: Boolean,
        isSquashed: Boolean,
        message: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Message') {
                    return false;
                }
                return true;
            },
        },
        threadView: {
            type: Object,
            optional: true,
            validate(p) {
                if (p.constructor.modelName !== 'ThreadView') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.Message',
});

QWeb.registerComponent('Message', Message);

return Message;

});
