odoo.define('mail/static/src/models/chat-window/chat-window.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/clear': clear,
    'Field/create': create,
    'Field/many2one': many2one,
    'Field/one2many': one2many,
    'Field/one2one': one2one,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * Close this chat window.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindow} chatWindow
     * @param {Object} [param2={}]
     * @param {boolean} [param2.notifyServer=true]
     */
    'ChatWindow/close'(
        { env },
        chatWindow,
        { notifyServer = true } = {}
    ) {
        const thread = chatWindow.$$$thread(this);
        env.invoke('Record/delete', chatWindow);
        // Flux specific: 'closed' fold state should only be saved on the
        // server when manually closing the chat window. Delete at destroy
        // or sync from server value for example should not save the value.
        if (thread && notifyServer) {
            env.invoke('Thread/notifyFoldStateToServer', thread, 'closed');
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindow} chatWindow
     */
    'ChatWindow/expand'(
        { env },
        chatWindow
    ) {
        if (chatWindow.$$$thread(this)) {
            env.invoke('Thread/open',
                chatWindow.$$$thread(this),
                { expanded: true }
            );
        }
    },
    /**
     * Programmatically auto-focus an existing chat window.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindow} chatWindow
     */
    'ChatWindow/focus'(
        { env },
        chatWindow
    ) {
        env.invoke('Record/update', chatWindow, {
            $$$isDoFocus: true,
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindow} chatWindow
     */
    'ChatWindow/focusNextVisibleUnfoldedChatWindow'(
        { env },
        chatWindow
    ) {
        const nextVisibleUnfoldedChatWindow =
            env.invoke('ChatWindow/_getNextVisibleUnfoldedChatWindow', chatWindow);
        if (nextVisibleUnfoldedChatWindow) {
            env.invoke('ChatWindow/focus', nextVisibleUnfoldedChatWindow);
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindow} chatWindow
     */
    'ChatWindow/focusPreviousVisibleUnfoldedChatWindow'(
        { env },
        chatWindow
    ) {
        const previousVisibleUnfoldedChatWindow =
            env.invoke('ChatWindow/_getNextVisibleUnfoldedChatWindow',
                chatWindow,
                { reverse: true }
            );
        if (previousVisibleUnfoldedChatWindow) {
            env.invoke('ChatWindow/focus', previousVisibleUnfoldedChatWindow);
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindow} chatWindow
     * @param {Object} [param2={}]
     * @param {boolean} [param2.notifyServer=true]
     */
    'ChatWindow/fold'(
        { env },
        chatWindow,
        { notifyServer = true } = {}
    ) {
        env.invoke('Record/update', chatWindow, { $$$isFolded: true });
        // Flux specific: manually folding the chat window should save the
        // new state on the server.
        if (chatWindow.$$$thread(this) && notifyServer) {
            env.invoke('Thread/notifyFoldStateToServer',
                chatWindow.$$$thread(this),
                'folded'
            );
        }
    },
    /**
     * Makes this chat window active, which consists of making it visible,
     * unfolding it, and focusing it.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindow} chatWindow
     * @param {Object} [options]
     */
    'ChatWindow/makeActive'(
        { env },
        chatWindow,
        options
    ) {
        env.invoke('ChatWindow/makeVisible', chatWindow);
        env.invoke('ChatWindow/unfold', chatWindow, options);
        env.invoke('ChatWindow/focus', chatWindow);
    },
    /**
     * Makes this chat window visible by swapping it with the last visible
     * chat window, or do nothing if it is already visible.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindow} chatWindow
     */
    'ChatWindow/makeVisible'(
        { env },
        chatWindow
    ) {
        if (chatWindow.$$$isVisible(this)) {
            return;
        }
        const lastVisible = chatWindow.$$$manager(this).$$$lastVisible(this);
        env.invoke('ChatWindowManager/swap',
            chatWindow.$$$manager(this),
            chatWindow,
            lastVisible
        );
    },
    /**
     * Shift this chat window to next visible position.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindow} chatWindow
     */
    'ChatWindow/shiftNext'({ env }, chatWindow) {
        env.invoke(
            'ChatWindowManager/shiftNext',
            chatWindow.$$$manager(this),
            chatWindow
        );
    },
    /**
     * Shift this chat window to previous visible position.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindow} chatWindow
     */
    'ChatWindow/shiftPrev'(
        { env },
        chatWindow
    ) {
        env.invoke(
            'ChatWindowManager/shiftPrev',
            chatWindow.$$$manager(this),
            chatWindow
        );
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindow} chatWindow
     * @param {Object} [param2={}]
     * @param {boolean} [param2.notifyServer=true]
     */
    'ChatWindow/unfold'(
        { env },
        chatWindow,
        { notifyServer = true } = {}
    ) {
        env.invoke('Record/update', chatWindow, { $$$isFolded: false });
        // Flux specific: manually opening the chat window should save the
        // new state on the server.
        if (chatWindow.$$$thread(this) && notifyServer) {
            env.invoke('Thread/notifyFoldStateToServer',
                chatWindow.$$$thread(this),
                'open'
            );
        }
    },
    /**
     * Cycles to the next possible visible and unfolded chat window starting
     * from the `currentChatWindow`, following the natural order based on the
     * current text direction, and with the possibility to `reverse` based on
     * the given parameter.
     *
     * @private
     * @param {Object} _
     * @param {ChatWindow} chatWindow
     * @param {Object} [param2={}]
     * @param {boolean} [param2.reverse=false]
     * @returns {ChatWindow|undefined}
     */
    'ChatWindow/_getNextVisibleUnfoldedChatWindow'(
        _,
        chatWindow,
        { reverse = false } = {}
    ) {
        const orderedVisible = chatWindow.$$$manager(this).$$$allOrderedVisible(this);
        /**
         * Return index of next visible chat window of a given visible chat
         * window index. The direction of "next" chat window depends on
         * `reverse` option.
         *
         * @param {integer} index
         * @returns {integer}
         */
        const _getNextIndex = index => {
            const directionOffset = reverse ? 1 : -1;
            let nextIndex = index + directionOffset;
            if (nextIndex > orderedVisible.length - 1) {
                nextIndex = 0;
            }
            if (nextIndex < 0) {
                nextIndex = orderedVisible.length - 1;
            }
            return nextIndex;
        };

        const currentIndex = orderedVisible.findIndex(
            visible => visible === chatWindow
        );
        let nextIndex = _getNextIndex(currentIndex);
        let nextToFocus = orderedVisible[nextIndex];
        while (nextToFocus.isFolded) {
            nextIndex = _getNextIndex(nextIndex);
            nextToFocus = orderedVisible[nextIndex];
        }
        return nextToFocus;
    },
});

const model = defineModel({
    name: 'ChatWindow',
    fields: {
        /**
         * Determines whether "new message form" should be displayed.
         */
        $$$hasNewMessageForm: attr({
            /**
             * @param {Object} param0
             * @param {ChatWindow} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return (
                    record.$$$isVisible(this) &&
                    !record.$$$isFolded(this) &&
                    !record.$$$thread(this)
                );
            },
        }),
        $$$hasShiftNext: attr({
            /**
             * @param {Object} param0
             * @param {ChatWindow} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (!record.$$$manager(this)) {
                    return false;
                }
                const index = record.$$$manager(this).$$$allOrderedVisible(this).findIndex(
                    visible => visible === record
                );
                if (index === -1) {
                    return false;
                }
                return index > 0;
            },
            default: false,
        }),
        $$$hasShiftPrev: attr({
            /**
             * @param {Object} param0
             * @param {ChatWindow} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (!record.$$$manager(this)) {
                    return false;
                }
                const allVisible = record.$$$manager(this).$$$allOrderedVisible(this);
                const index = allVisible.findIndex(visible => visible === record);
                if (index === -1) {
                    return false;
                }
                return index < allVisible.length - 1;
            },
            default: false,
        }),
        /**
         * Determines whether `this.thread` should be displayed.
         */
        $$$hasThreadView: attr({
            /**
             * @param {Object} param0
             * @param {ChatWindow} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return (
                    record.$$$isVisible(this) &&
                    !record.$$$isFolded(this) &&
                    record.$$$thread(this)
                );
            },
        }),
        /**
         * Determine whether the chat window should be programmatically
         * focused by observed component of chat window. Those components
         * are responsible to unmark this record afterwards, otherwise
         * any re-render will programmatically set focus again!
         */
        $$$isDoFocus: attr({
            default: false,
        }),
        /**
         * States whether `this` is focused. Useful for visual clue.
         */
        $$$isFocused: attr({
            default: false,
        }),
        /**
         * Determines whether `this` is folded.
         */
        $$$isFolded: attr({
            default: false,
        }),
        /**
         * States whether `this` is visible or not. Should be considered
         * read-only. Setting this value manually will not make it visible.
         * @see `makeVisible`
         */
        $$$isVisible: attr({
            /**
             * @param {Object} param0
             * @param {ChatWindow} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (!record.$$$manager(this)) {
                    return false;
                }
                return record.$$$manager(this).$$$allOrderedVisible(this).includes(record);
            },
        }),
        $$$manager: many2one('ChatWindowManager', {
            inverse: '$$$chatWindows',
        }),
        $$$managerAllOrderedVisible: one2many('ChatWindow', {
            related: '$$$manager.$$$allOrderedVisible',
        }),
        $$$managerVisual: attr({
            related: '$$$manager.$$$visual',
        }),
        $$$name: attr({
            /**
             * @private
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ChatWindow} param0.record
             * @returns {string}
             */
            compute({ env, record }) {
                if (record.$$$thread(this)) {
                    return record.$$$thread(this).$$$displayName(this);
                }
                return env._t("New message");
            },
        }),
        /**
         * Determines the `Thread` that should be displayed by `this`.
         * If no `Thread` is linked, `this` is considered "new message".
         */
        $$$thread: one2one('Thread', {
            inverse: '$$$chatWindow',
        }),
        $$$threadDisplayName: attr({
            related: '$$$thread.$$$displayName',
        }),
        /**
         * States the `ThreadView` displaying `this.thread`.
         */
        $$$threadView: one2one('ThreadView', {
            related: '$$$threadViewer.$$$threadView',
        }),
        /**
         * Determines the `ThreadViewer` managing the display of `this.thread`.
         */
        $$$threadViewer: one2one('ThreadViewer', {
            default: create(),
            inverse: '$$$chatWindow',
            isCausal: true,
        }),
        /**
         * This field handle the "order" (index) of the visible chatWindow
         * inside the UI.
         *
         * Using LTR, the right-most chat window has index 0, and the number is
         * incrementing from right to left.
         * Using RTL, the left-most chat window has index 0, and the number is
         * incrementing from left to right.
         */
        $$$visibleIndex: attr({
            /**
             * @param {Object} param0
             * @param {ChatWindow} param0.record
             * @returns {integer|undefined}
             */
            compute({ record }) {
                if (!record.$$$manager(this)) {
                    return clear();
                }
                const visible = record.$$$manager(this).$$$visual(this).visible;
                const index = visible.findIndex(
                    visible => visible.chatWindowLocalId === record.localId
                );
                if (index === -1) {
                    return clear();
                }
                return index;
            },
        }),
        $$$visibleOffset: attr({
            /**
             * @param {Object} param0
             * @param {ChatWindow} param0.record
             * @returns {integer}
             */
            compute({ record }) {
                if (!record.$$$manager(this)) {
                    return 0;
                }
                const visible = record.$$$manager(this).$$$visual(this).visible;
                const index = visible.findIndex(
                    visible => visible.chatWindowLocalId === record.localId
                );
                if (index === -1) {
                    return 0;
                }
                return visible[index].offset;
            },
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/chat-window/chat-window.js',
    actions,
    model,
);

});
