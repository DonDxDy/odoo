odoo.define('mail/static/src/components/message-list/message-list.js', function (require) {
'use strict';

const useRefs = require('mail/static/src/component-hooks/use-refs/use-refs.js');
const useUpdate = require('mail/static/src/component-hooks/use-update/use-update.js');
const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;
const { useRef } = owl.hooks;

class MessageList extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this._getRefs = useRefs();
        useUpdate({ func: () => this._update() });
        /**
         * Determine whether the auto-scroll on load is active or not. This
         * is useful to disable some times, such as when mounting message list
         * in ASC order: the initial scroll position is at the top of the
         * conversation, and most of the time the expected initial scroll
         * position should be at the bottom of the thread. During this time,
         * the programmatical scrolling should not trigger auto-load messages
         * on scroll.
         */
        this._isAutoLoadOnScrollActive = true;
        /**
         * Reference of the "load more" item. Useful to trigger load more
         * on scroll when it becomes visible.
         */
        this._loadMoreRef = useRef('loadMore');
        /**
         * Snapshot computed during willPatch, which is used by patched.
         */
        this._willPatchSnapshot = undefined;
        this._onScrollThrottled = _.throttle(this._onScrollThrottled.bind(this), 100);
    }

    willPatch() {
        const lastMessageRef = this.lastMessageRef;
        this._willPatchSnapshot = {
            isLastMessageVisible:
                lastMessageRef &&
                lastMessageRef.isBottomVisible({ offset: 10 }),
            scrollHeight: this.el.scrollHeight,
            scrollTop: this.el.scrollTop,
        };
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Update the scroll position of the message list.
     * This is not done in patched/mounted hooks because scroll position is
     * dependent on UI globally. To illustrate, imagine following UI:
     *
     * +----------+ < viewport top = scrollable top
     * | message  |
     * |   list   |
     * |          |
     * +----------+ < scrolltop = viewport bottom = scrollable bottom
     *
     * Now if a composer is mounted just below the message list, it is shrinked
     * and scrolltop is altered as a result:
     *
     * +----------+ < viewport top = scrollable top
     * | message  |
     * |   list   | < scrolltop = viewport bottom  <-+
     * |          |                                  |-- dist = composer height
     * +----------+ < scrollable bottom            <-+
     * +----------+
     * | composer |
     * +----------+
     *
     * Because of this, the scroll position must be changed when whole UI
     * is rendered. To make this simpler, this is done when <ThreadView/>
     * component is patched. This is acceptable when <ThreadView/> has a
     * fixed height, which is the case for the moment. task-2358066
     */
    async adjustFromComponentHints() {
        if (!this.threadView) {
            return;
        }
        if (this.el) {
            return;
        }
        for (const hint of this.threadView.$$$componentHintList(this)) {
            switch (hint.type) {
                case 'change-of-thread-cache':
                    this._adjustFromChangeOfThreadCache(hint);
                    break;
                case 'home-menu-hidden':
                    this._adjustFromHomeMenuHidden(hint);
                    break;
                case 'home-menu-shown':
                    this._adjustFromHomeMenuShown(hint);
                    break;
                case 'messages-loaded':
                    this.threadView.markComponentHintProcessed(hint);
                    break;
                case 'message-received':
                    this._adjustFromMessageReceived(hint);
                    break;
                case 'more-messages-loaded':
                    this._adjustFromMoreMessagesLoaded(hint);
                    break;
                case 'new-messages-loaded':
                    this.env.invoke('ThreadView/markComponentHintProcessed',
                        this.threadView,
                        hint
                    );
                    break;
            }
        }
        this._willPatchSnapshot = undefined;
    }

    /**
     * @param {Message} message
     * @returns {string}
     */
    getDateDay(message) {
        const date = message.$$$date(this).format('YYYY-MM-DD');
        if (date === moment().format('YYYY-MM-DD')) {
            return this.env._t("Today");
        } else if (
            date === moment()
                .subtract(1, 'days')
                .format('YYYY-MM-DD')
        ) {
            return this.env._t("Yesterday");
        }
        return message.$$$date(this).format('LL');
    }

    /**
     * @returns {integer}
     */
    getScrollHeight() {
        return this.el.scrollHeight;
    }

    /**
     * @returns {integer}
     */
    getScrollTop() {
        return this.el.scrollTop;
    }

    /**
     * @returns {mail/static/src/components/Message/Message.js|undefined}
     */
    get mostRecentMessageRef() {
        if (this.order === 'desc') {
            return this.messageRefs[0];
        }
        const {
            length: l,
            [l - 1]: mostRecentMessageRef,
        } = this.messageRefs;
        return mostRecentMessageRef;
    }

    /**
     * @param {integer} messageId
     * @returns {mail/static/src/components/Message/Message.js|undefined}
     */
    messageRefFromId(messageId) {
        return this.messageRefs.find(
            ref => ref.message.$$$id(this) === messageId
        );
    }

    /**
     * Get list of sub-components Message, ordered based on prop `order`
     * (ASC/DESC).
     *
     * The asynchronous nature of OWL rendering pipeline may reveal disparity
     * between knowledgeable state of store between components. Use this getter
     * with extreme caution!
     *
     * Let's illustrate the disparity with a small example:
     *
     * - Suppose this component is aware of ordered (record) messages with
     *   following IDs: [1, 2, 3, 4, 5], and each (sub-component) messages map
     * each of these records.
     * - Now let's assume a change in store that translate to ordered (record)
     *   messages with following IDs: [2, 3, 4, 5, 6].
     * - Because store changes trigger component re-rendering by their "depth"
     *   (i.e. from parents to children), this component may be aware of
     *   [2, 3, 4, 5, 6] but not yet sub-components, so that some (component)
     *   messages should be destroyed but aren't yet (the ref with message ID 1)
     *   and some do not exist yet (no ref with message ID 6).
     *
     * @returns {mail/static/src/components/Message/Message.js[]}
     */
    get messageRefs() {
        const refs = this._getRefs();
        const ascOrderedMessageRefs = Object.entries(refs)
            .filter(
                ([refId, ref]) => (
                    // Message refs have message local id as ref id, and message
                    // local ids contain name of model 'Message'.
                    refId.includes('Message') &&
                    // Component that should be destroyed but haven't just yet.
                    ref.message
                )
            )
            .map(
                ([refId, ref]) => ref
            )
            .sort(
                (ref1, ref2) => (
                    ref1.message.$$$id(this) < ref2.message.$$$id(this)
                    ? -1
                    : 1
                )
            );
        if (this.order === 'desc') {
            return ascOrderedMessageRefs.reverse();
        }
        return ascOrderedMessageRefs;
    }

    /**
     * @returns {Message[]}
     */
    get orderedMessages() {
        const threadCache = this.threadView.$$$threadCache(this);
        if (this.order === 'desc') {
            return [...threadCache.$$$orderedMessages(this)].reverse();
        }
        return threadCache.$$$orderedMessages(this);
    }

    /**
     * @param {integer} value
     */
    async setScrollTop(value) {
        this._isAutoLoadOnScrollActive = false;
        this.el.scrollTop = value;
        await new Promise(resolve => setTimeout(resolve, 0));
        this._isAutoLoadOnScrollActive = true;
    }

    /**
     * @param {Message} prevMessage
     * @param {Message} message
     * @returns {boolean}
     */
    shouldMessageBeSquashed(prevMessage, message) {
        if (!this.hasSquashCloseMessages) {
            return false;
        }
        if (Math.abs(message.$$$date(this).diff(prevMessage.$$$date(this))) > 60000) {
            // more than 1 min. elasped
            return false;
        }
        if (
            prevMessage.$$$type(this) !== 'comment' ||
            message.$$$type(this) !== 'comment'
        ) {
            return false;
        }
        if (prevMessage.$$$author(this) !== message.$$$author(this)) {
            // from a different author
            return false;
        }
        if (prevMessage.$$$originThread(this) !== message.$$$originThread(this)) {
            return false;
        }
        if (
            prevMessage.$$$moderationStatus(this) === 'pending_moderation' ||
            message.$$$moderationStatus(this) === 'pending_moderation'
        ) {
            return false;
        }
        if (
            prevMessage.$$$notifications(this).length > 0 ||
            message.$$$notifications(this).length > 0
        ) {
            // visual about notifications is restricted to non-squashed messages
            return false;
        }
        const prevOriginThread = prevMessage.$$$originThread(this);
        const originThread = message.$$$originThread(this);
        if (
            prevOriginThread &&
            originThread &&
            prevOriginThread.$$$model(this) === originThread.$$$model(this) &&
            originThread.$$$model(this) !== 'mail.channel' &&
            prevOriginThread.$$$id(this) !== originThread.$$$id(this)
        ) {
            // messages linked to different document thread
            return false;
        }
        return true;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Object} hint
     */
    async _adjustFromChangeOfThreadCache(hint) {
        const threadCache = this.threadView.$$$threadCache(this);
        if (!threadCache.$$$isLoaded(this)) {
            return;
        }
        let isProcessed = false;
        if (threadCache.$$$messages(this).length > 0) {
            if (this.threadView.$$$threadCacheInitialScrollPosition(this) !== undefined) {
                if (this.hasScrollAdjust) {
                    if (
                        this.el.scrollHeight ===
                        this.threadView.$$$threadCacheInitialScrollHeight(this)
                    ) {
                        this.el.scrollTop = this.threadView.$$$threadCacheInitialScrollPosition(this);
                        isProcessed = true;
                    }
                } else {
                    isProcessed = true;
                }
            } else {
                const lastMessage = threadCache.$$$lastMessage(this);
                if (this.messageRefFromId(lastMessage.$$$id(this))) {
                    if (this.hasScrollAdjust) {
                        this._scrollToMostRecentMessage();
                    }
                    isProcessed = true;
                }
            }
        } else {
            isProcessed = true;
        }
        if (isProcessed) {
            this.env.invoke('ThreadView/markComponentHintProcessed',
                this.threadView,
                hint
            );
        }
    }

    /**
     * @private
     * @param {Object} hint
     */
    _adjustFromChatWindowUnfolded(hint) {
        if (this._adjustScrollFromModel()) {
            this.env.invoke('ThreadView/markComponentHintProcessed',
                this.threadView,
                hint
            );
        }
    }

    /**
     * @private
     * @param {Object} hint
     */
    _adjustFromHomeMenuHidden(hint) {
        if (this._adjustScrollFromModel()) {
            this.env.invoke('ThreadView/markComponentHintProcessed',
                this.threadView,
                hint
            );
        }
    }

    /**
     * @private
     * @param {Object} hint
     */
    _adjustFromHomeMenuShown(hint) {
        if (this._adjustScrollFromModel()) {
            this.env.invoke('ThreadView/markComponentHintProcessed',
                this.threadView,
                hint
            );
        }
    }

    /**
     * @private
     * @param {Object} hint
     */
    async _adjustFromMessageReceived(hint) {
        const threadCache = this.threadView.$$$threadCache(this);
        if (!threadCache.$$$isLoaded(this)) {
            return;
        }
        const { message } = hint.data;
        if (!threadCache.$$$messages(this).includes(message)) {
            return;
        }
        if (!this.messageRefFromId(message.$$$id(this))) {
            return;
        }
        if (!this.hasScrollAdjust) {
            this.env.invoke('ThreadView/markComponentHintProcessed',
                this.threadView,
                hint
            );
            return;
        }
        if (!this.threadView.$$$hasAutoScrollOnMessageReceived(this)) {
            this.env.invoke('ThreadView/markComponentHintProcessed',
                this.threadView,
                hint
            );
            return;
        }
        if (
            this.threadView.$$$lastVisibleMessage(this) &&
            (message.$$$id(this) < this.threadView.$$$lastVisibleMessage(this).$$$id(this))
        ) {
            this.env.invoke('ThreadView/markComponentHintProcessed',
                this.threadView,
                hint
            );
            return;
        }
        await this._scrollToMessage(message.$$$id(this));
        this.env.invoke('ThreadView/markComponentHintProcessed',
            this.threadView,
            hint
        );
    }

    /**
     * @private
     * @param {Object} hint
     */
    _adjustFromMoreMessagesLoaded(hint) {
        if (!this._willPatchSnapshot) {
            this.env.invoke('ThreadView/markComponentHintProcessed',
                this.threadView,
                hint
            );
            return;
        }
        const { scrollHeight, scrollTop } = this._willPatchSnapshot;
        if (this.order === 'asc' && this.hasScrollAdjust) {
            this.el.scrollTop = this.el.scrollHeight - scrollHeight + scrollTop;
        }
        this.env.invoke('ThreadView/markComponentHintProcessed',
            this.threadView,
            hint
        );
    }

    /**
     * @private
     * @returns {boolean} whether the adjustment should be considered processed
     */
    _adjustScrollFromModel() {
        if (
            (
                this.threadView.$$$threadCacheInitialScrollPosition(this) !==
                undefined
            ) &&
            this.hasScrollAdjust
        ) {
            if (
                this.el.scrollHeight ===
                this.threadView.$$$threadCacheInitialScrollHeight(this)
            ) {
                this.el.scrollTop =
                    this.threadView.$$$threadCacheInitialScrollPosition(this);
                return true;
            } else {
                return false;
            }
        }
        return true;
    }

    /**
     * @private
     */
    _checkMostRecentMessageIsVisible() {
        if (!this.threadView) {
            return;
        }
        const thread = this.threadView.$$$thread(this);
        const threadCache = this.threadView.$$$threadCache(this);
        const lastMessageIsVisible =
            threadCache &&
            threadCache.$$$messages(this).length > 0 &&
            this.mostRecentMessageRef &&
            threadCache === thread.$$$mainCache(this) &&
            this.mostRecentMessageRef.isPartiallyVisible();
        if (lastMessageIsVisible) {
            this.env.invoke('ThreadView/handleVisibleMessage',
                this.threadView,
                this.mostRecentMessageRef.message
            );
        }
    }

    /**
     * @private
     * @returns {boolean}
     */
    _isLoadMoreVisible() {
        const loadMore = this._loadMoreRef.el;
        if (!loadMore) {
            return false;
        }
        const loadMoreRect = loadMore.getBoundingClientRect();
        const elRect = this.el.getBoundingClientRect();
        const isInvisible = loadMoreRect.top > elRect.bottom || loadMoreRect.bottom < elRect.top;
        return !isInvisible;
    }

    /**
     * @private
     */
    _loadMore() {
        this.env.invoke('ThreadCache/loadMoreMessages',
            this.threadView.$$$threadCache(this)
        );
    }

    /**
     * @private
     * @returns {Promise}
     */
    async _scrollToMostRecentMessage() {
        if (!this.mostRecentMessageRef) {
            return;
        }
        this._isAutoLoadOnScrollActive = false;
        await this.mostRecentMessageRef.scrollIntoView();
        if (!this.el) {
            this._isAutoLoadOnScrollActive = true;
            return;
        }
        this.el.scrollTop = this.order === 'asc'
            ? this.el.scrollTop + 15
            : this.el.scrollTop - 15;
        this._isAutoLoadOnScrollActive = true;
    }

    /**
     * @param {integer} messageId
     */
    async _scrollToMessage(messageId) {
        const messageRef = this.messageRefFromId(messageId);
        if (!messageRef) {
            return;
        }
        this._isAutoLoadOnScrollActive = false;
        await messageRef.scrollIntoView();
        if (!this.el) {
            this._isAutoLoadOnScrollActive = true;
            return;
        }
        this.el.scrollTop = this.order === 'asc'
            ? this.el.scrollTop + 15
            : this.el.scrollTop - 15;
        this._isAutoLoadOnScrollActive = true;
    }

    /**
     * @private
     */
    _update() {
        this.adjustFromComponentHints();
        this._checkMostRecentMessageIsVisible();
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickLoadMore(ev) {
        ev.preventDefault();
        this._loadMore();
    }

    /**
     * @private
     * @param {ScrollEvent} ev
     */
    onScroll(ev) {
        if (!this.threadView) {
            return;
        }
        // Clear pending hints to prevent them from potentially overriding the
        // new scroll position.
        for (const hint of this.threadView.$$$componentHintList(this)) {
            this.env.invoke(
                'ThreadView/markComponentHintProcessed',
                this.threadView,
                hint
            );
        }
        this._onScrollThrottled(ev);
    }

    /**
     * @private
     * @param {ScrollEvent} ev
     */
    _onScrollThrottled(ev) {
        if (!this.el) {
            // could be unmounted in the meantime (due to throttled behavior)
            return;
        }
        if (
            !this.threadView ||
            !this.threadView.$$$threadViewer(this)
        ) {
            return;
        }
        const scrollTop = this.el.scrollTop;
        this.env.messagingBus.trigger('o-component-message-list-scrolled', {
            scrollTop,
            threadViewer: this.threadView.$$$threadViewer(this),
        });
        // Margin to compensate for inaccurate scrolling to bottom.
        const margin = 4;
        // Automatically scroll to new received messages only when the list is
        // currently fully scrolled.
        const hasAutoScrollOnMessageReceived = (this.order === 'asc')
            ? scrollTop >= this.el.scrollHeight - this.el.clientHeight - margin
            : scrollTop <= margin;
            this.env.invoke('Record/update', this.threadView, {
            $$$hasAutoScrollOnMessageReceived: hasAutoScrollOnMessageReceived,
        });
        this.env.invoke('ThreadViewer/saveThreadCacheScrollHeightAsInitial',
            this.threadView.$$$threadViewer(this),
            this.el.scrollHeight
        );
        this.env.invoke('ThreadViewer/saveThreadCacheScrollPositionsAsInitial',
            this.threadView.$$$threadViewer(this),
            scrollTop
        );
        if (!this._isAutoLoadOnScrollActive) {
            return;
        }
        if (this._isLoadMoreVisible()) {
            this._loadMore();
        }
        this._checkMostRecentMessageIsVisible();
    }

}

Object.assign(MessageList, {
    defaultProps: {
        hasMessageCheckbox: false,
        hasScrollAdjust: true,
        hasSquashCloseMessages: false,
        haveMessagesMarkAsReadIcon: false,
        haveMessagesReplyIcon: false,
        order: 'asc',
    },
    props: {
        hasMessageCheckbox: Boolean,
        hasSquashCloseMessages: Boolean,
        haveMessagesMarkAsReadIcon: Boolean,
        haveMessagesReplyIcon: Boolean,
        hasScrollAdjust: Boolean,
        order: {
            type: String,
            validate: prop => ['asc', 'desc'].includes(prop),
        },
        selectedMessage: {
            type: Object,
            optional: true,
            validate(p) {
                if (!p.constructor.modelName !== 'Message') {
                    return false;
                }
                return true;
            },
        },
        threadView: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'ThreadView') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.MessageList',
});

QWeb.registerComponent('MessageList', MessageList);

return MessageList;

});
