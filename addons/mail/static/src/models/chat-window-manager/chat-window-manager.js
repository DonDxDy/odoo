odoo.define('mail/static/src/models/chat-window-manager/chat-window-manager.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/link': link,
    'Field/many2one': many2one,
    'Field/one2many': one2many,
    'Field/one2one': one2one,
    'Field/replace': replace,
    'Field/unlink': unlink,
} = require('mail/static/src/model/utils.js');

const BASE_VISUAL = {
    /**
     * Amount of visible slots available for chat windows.
     */
    availableVisibleSlots: 0,
    /**
     * Data related to the hidden menu.
     */
    hidden: {
        /**
         * List of hidden docked chat windows. Useful to compute counter.
         * Chat windows are ordered by their `chatWindows` order.
         */
        chatWindowLocalIds: [],
        /**
         * Whether hidden menu is visible or not
         */
        isVisible: false,
        /**
         * Offset of hidden menu starting point from the starting point
         * of chat window manager. Makes only sense if it is visible.
         */
        offset: 0,
    },
    /**
     * Data related to visible chat windows. Index determine order of
     * docked chat windows.
     *
     * Value:
     *
     *  {
     *      chatWindowLocalId,
     *      offset,
     *  }
     *
     * Offset is offset of starting point of docked chat window from
     * starting point of dock chat window manager. Docked chat windows
     * are ordered by their `chatWindows` order
     */
    visible: [],
};

const actions = defineActions({
    /**
     * Close all chat windows.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     */
    'ChatWindowManager/closeAll'(
        { env },
        chatWindowManager
    ) {
        const chatWindows = chatWindowManager.$$$allOrdered(this);
        for (const chatWindow of chatWindows) {
            env.invoke('ChatWindow/close', chatWindow);
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     */
    'ChatWindowManager/closeHiddenMenu'(
        { env },
        chatWindowManager
    ) {
        env.invoke('Record/update', chatWindowManager, {
            $$$isHiddenMenuOpen: false,
        });
    },
    /**
     * Closes all chat windows related to the given thread.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     * @param {Thread} thread
     * @param {Object} [options]
     */
    'ChatWindowManager/closeThread'(
        { env },
        chatWindowManager,
        thread,
        options
    ) {
        for (const chatWindow of chatWindowManager.$$$chatWindows(this)) {
            if (chatWindow.$$$thread(this) === thread) {
                env.invoke('ChatWindow/close', chatWindow, options);
            }
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     */
    'ChatWindowManager/openHiddenMenu'({ env }, chatWindowManager) {
        env.invoke('Record/update', chatWindowManager, {
            $$$isHiddenMenuOpen: true,
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     */
    'ChatWindowManager/openNewMessage'({ env }, chatWindowManager) {
        let newMessageChatWindow = chatWindowManager.$$$newMessageChatWindow(this);
        if (!newMessageChatWindow) {
            newMessageChatWindow = env.invoke('ChatWindow/create', {
                $$$manager: link(chatWindowManager),
            });
        }
        env.invoke('ChatWindow/makeActive', newMessageChatWindow);
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     * @param {Thread} thread
     * @param {Object} [param3={}]
     * @param {boolean} [param3.isFolded=false]
     * @param {boolean} [param3.makeActive=false]
     * @param {boolean} [param3.notifyServer=true]
     * @param {boolean} [param3.replaceNewMessage=false]
     */
    'ChatWindowManager/openThread'(
        { env },
        chatWindowManager,
        thread,
        {
            isFolded = false,
            makeActive = false,
            notifyServer = true,
            replaceNewMessage = false
        } = {}
    ) {
        let chatWindow = chatWindowManager.$$$chatWindows(this).find(chatWindow =>
            chatWindow.$$$thread(this) === thread
        );
        if (!chatWindow) {
            chatWindow = env.invoke('ChatWindow/create', {
                $$$isFolded: isFolded,
                $$$manager: link(chatWindowManager),
                $$$thread: link(thread),
            });
        } else {
            env.invoke('Record/update', chatWindow, {
                $$$isFolded: isFolded,
            });
        }
        if (replaceNewMessage && chatWindowManager.$$$newMessageChatWindow(this)) {
            env.invoke('ChatWindowManager/swap',
                chatWindowManager,
                chatWindow,
                chatWindowManager.$$$newMessageChatWindow(this)
            );
            env.invoke('ChatWindow/close', chatWindowManager.$$$newMessageChatWindow(this));
        }
        if (makeActive) {
            // avoid double notify at this step, it will already be done at
            // the end of the current method
            env.invoke('ChatWindow/makeActive',
                chatWindow,
                { notifyServer: false }
            );
        }
        // Flux specific: notify server of chat window being opened.
        if (notifyServer) {
            const foldState = chatWindow.$$$isFolded(this) ? 'folded' : 'open';
            env.invoke('Thread/notifyFoldStateToServer', thread, foldState);
        }
    },
    /**
     * Shift provided chat window to previous visible index, which swap
     * visible order of this chat window and the preceding visible one
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     * @param {ChatWindow} chatWindow
     */
    'ChatWindowManager/shiftPrev'(
        { env },
        chatWindowManager,
        chatWindow
    ) {
        const chatWindows = chatWindowManager.$$$allOrdered(this);
        const index = chatWindows.findIndex(cw => cw === chatWindow);
        if (index === chatWindows.length - 1) {
            // already first one
            return;
        }
        const otherChatWindow = chatWindows[index + 1];
        const _newOrdered = [...chatWindowManager.$$$_ordered(this)];
        _newOrdered[index] = otherChatWindow.localId;
        _newOrdered[index + 1] = chatWindow.localId;
        env.invoke('Record/update', chatWindowManager, {
            $$$_ordered: _newOrdered,
        });
        env.invoke('ChatWindow/focus', chatWindow);
    },
    /**
     * Shift provided chat window to next visible index, which swap visible
     * order of this chat window and the following visible one.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     * @param {ChatWindow} chatWindow
     */
    'ChatWindowManager/shiftNext'(
        { env },
        chatWindowManager,
        chatWindow
    ) {
        const chatWindows = chatWindowManager.$$$allOrdered(this);
        const index = chatWindows.findIndex(cw => cw === chatWindow);
        if (index === 0) {
            // already last one
            return;
        }
        const otherChatWindow = chatWindows[index - 1];
        const _newOrdered = [...chatWindowManager.$$$_ordered(this)];
        _newOrdered[index] = otherChatWindow.localId;
        _newOrdered[index - 1] = chatWindow.localId;
        env.invoke('Record/update', chatWindowManager, {
            $$$_ordered: _newOrdered,
        });
        env.invoke('ChatWindow/focus', chatWindow);
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     */
    'ChatWindowManager/start'(
        { env },
        chatWindowManager
    ) {
        const _onHideHomeMenu = () => env.invoke(
            'ChatWindowManager/_onHideHomeMenu',
            chatWindowManager
        );
        const _onShowHomeMenu = () => env.invoke(
            'ChatWindowManager/_onShowHomeMenu',
            chatWindowManager
        );
        Object.assign(chatWindowManager, {
            _onHideHomeMenu,
            _onShowHomeMenu,
        });
        env.messagingBus.on(
            'hide_home_menu',
            null,
            chatWindowManager._onHideHomeMenu()
        );
        env.messagingBus.on(
            'show_home_menu',
            null,
            chatWindowManager._onShowHomeMenu()
        );
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     */
    'ChatWindowManager/stop'(
        { env },
        chatWindowManager
    ) {
        env.messagingBus.off(
            'hide_home_menu',
            null,
            chatWindowManager._onHideHomeMenu
        );
        env.messagingBus.off(
            'show_home_menu',
            null,
            chatWindowManager._onShowHomeMenu
        );
        Object.assign(chatWindowManager, {
            _onHideHomeMenu: () => {},
            _onShowHomeMenu: () => {},
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     * @param {ChatWindow} chatWindow1
     * @param {ChatWindow} chatWindow2
     */
    'ChatWindowManager/swap'(
        { env },
        chatWindowManager,
        chatWindow1,
        chatWindow2
    ) {
        const ordered = chatWindowManager.$$$allOrdered(this);
        const index1 = ordered.findIndex(chatWindow => chatWindow === chatWindow1);
        const index2 = ordered.findIndex(chatWindow => chatWindow === chatWindow2);
        if (index1 === -1 || index2 === -1) {
            return;
        }
        const _newOrdered = [...chatWindowManager.$$$_ordered(this)];
        _newOrdered[index1] = chatWindow2.localId;
        _newOrdered[index2] = chatWindow1.localId;
        env.invoke('Record/update', chatWindowManager, {
            $$$_ordered: _newOrdered,
        });
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     */
    'ChatWindowManager/_onHideHomeMenu'(
        { env },
        chatWindowManager
    ) {
        for (const chatWindow of chatWindowManager.$$$chatWindows(this)) {
            if (!chatWindow.$$$threadView(this)) {
                return;
            }
            env.invoke(
                'ThreadView/addComponentHint',
                chatWindow.$$$threadView(this),
                'home-menu-hidden'
            );
        }
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ChatWindowManager} chatWindowManager
     */
    'ChatWindowManager/_onShowHomeMenu'(
        { env },
        chatWindowManager
    ) {
        for (const chatWindow of chatWindowManager.$$$chatWindows(this)) {
            if (!chatWindow.$$$threadView(this)) {
                return;
            }
            env.invoke(
                'ThreadView/addComponentHint',
                chatWindow.$$$threadView(this),
                'home-menu-shown'
            );
        }
    },
});

const model = defineModel({
    name: 'ChatWindowManager',
    fields: {
        /**
         * List of ordered chat windows (list of local ids)
         */
        $$$_ordered: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ChatWindowManager} param0.record
             * @returns {string[]}
             */
            compute({ env, record }) {
                // remove unlinked chatWindows
                const _ordered = record.$$$_ordered(this).filter(chatWindowLocalId =>
                    record.$$$chatWindows(this).includes(
                        env.invoke('Record/get', chatWindowLocalId)
                    )
                );
                // add linked chatWindows
                for (const chatWindow of record.$$$chatWindows(this)) {
                    if (!_ordered.includes(chatWindow.localId)) {
                        _ordered.push(chatWindow.localId);
                    }
                }
                return _ordered;
            },
            default: [],
        }),
        // FIXME: dependent on implementation that uses arbitrary order in relations!!
        $$$allOrdered: one2many('ChatWindow', {
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ChatWindowManager} param0.record
             * @returns {ChatWindow}
             */
            compute({ env, record }) {
                return replace(
                    record.$$$_ordered(this).map(chatWindowLocalId =>
                        env.invoke('Record/get', chatWindowLocalId)
                    )
                );
            },
        }),
        $$$allOrderedThread: one2many('Thread', {
            related: '$$$allOrdered.$$$thread',
        }),
        $$$allOrderedHidden: one2many('ChatWindow', {
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ChatWindowManager} param0.record
             * @returns {ChatWindow[]}
             */
            compute({ env, record }) {
                return replace(
                    record.$$$visual(this).hidden.chatWindowLocalIds.map(
                        chatWindowLocalId => env.invoke('Record/get', chatWindowLocalId)
                    )
                );
            },
        }),
        $$$allOrderedHiddenThread: one2many('Thread', {
            related: '$$$allOrderedHidden.$$$thread',
        }),
        $$$allOrderedHiddenThreadMessageUnreadCounter: attr({
            related: '$$$allOrderedHiddenThread.$$$localMessageUnreadCounter',
        }),
        $$$allOrderedVisible: one2many('ChatWindow', {
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ChatWindowManager} param0.record
             * @returns {ChatWindow[]}
             */
            compute({ env, record }) {
                return replace(
                    record.$$$visual(this).visible.map(
                        ({ chatWindowLocalId }) => env.invoke('Record/get', chatWindowLocalId)
                    )
                );
            },
        }),
        $$$chatWindows: one2many('ChatWindow', {
            inverse: '$$$manager',
            isCausal: true,
        }),
        $$$device: one2one('Device', {
            related: '$$$messaging.$$$device',
        }),
        $$$deviceGlobalWindowInnerWidth: attr({
            related: '$$$device.$$$globalWindowInnerWidth',
        }),
        $$$deviceIsMobile: attr({
            related: '$$$device.$$$isMobile',
        }),
        $$$discuss: one2one('Discuss', {
            related: '$$$messaging.$$$discuss',
        }),
        $$$discussIsOpen: attr({
            related: '$$$discuss.$$$isOpen',
        }),
        $$$hasHiddenChatWindows: attr({
            /**
             * @param {Object} param0
             * @param {ChatWindowManager} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return record.$$$allOrderedHidden(this).length > 0;
            },
        }),
        $$$hasVisibleChatWindows: attr({
            /**
             * @param {Object} param0
             * @param {ChatWindowManager} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return record.$$$allOrderedVisible(this).length > 0;
            },
        }),
        $$$isHiddenMenuOpen: attr({
            default: false,
        }),
        $$$lastVisible: many2one('ChatWindow', {
            /**
             * @param {Object} param0
             * @param {ChatWindowManager} param0.record
             * @returns {ChatWindow|undefined}
             */
            compute({ record }) {
                const {
                    length: l,
                    [l - 1]: lastVisible,
                } = record.$$$allOrderedVisible(this);
                if (!lastVisible) {
                    return unlink();
                }
                return link(lastVisible);
            },
        }),
        $$$messaging: one2one('Messaging', {
            inverse: '$$$chatWindowManager',
        }),
        $$$newMessageChatWindow: one2one('ChatWindow', {
            /**
             * @param {Object} param0
             * @param {ChatWindow_manager} param0.record
             * @returns {ChatWindow|undefined}
             */
            compute({ record }) {
                const chatWindow = record.$$$allOrdered(this).find(
                    chatWindow => !chatWindow.$$$thread(this)
                );
                if (!chatWindow) {
                    return unlink();
                }
                return link(chatWindow);
            },
        }),
        $$$unreadHiddenConversationAmount: attr({
            /**
             * @param {Object} param0
             * @param {ChatWindowManager} param0.record
             * @returns {integer}
             */
            compute({ record }) {
                const allHiddenWithThread = record.$$$allOrderedHidden(this).filter(
                    chatWindow => chatWindow.$$$thread(this)
                );
                let amount = 0;
                for (const chatWindow of allHiddenWithThread) {
                    if (chatWindow.$$$thread(this).$$$localMessageUnreadCounter(this) > 0) {
                        amount++;
                    }
                }
                return amount;
            },
        }),
        $$$visual: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ChatWindowManager} param0.record
             * @returns {Object}
             */
            compute({ env, record }) {
                let visual = JSON.parse(JSON.stringify(BASE_VISUAL));
                if (!env.messaging) {
                    return visual;
                }
                const device = env.messaging.$$$device(this);
                const discuss = env.messaging.$$$discuss(this);
                const BETWEEN_GAP_WIDTH = 5;
                const CHAT_WINDOW_WIDTH = 325;
                const END_GAP_WIDTH = device.$$$isMobile(this) ? 0 : 10;
                const GLOBAL_WINDOW_WIDTH = device.$$$globalWindowInnerWidth(this);
                const HIDDEN_MENU_WIDTH = 200; // max width, including width of dropup list items
                const START_GAP_WIDTH = device.$$$isMobile(this) ? 0 : 10;
                const chatWindows = record.$$$allOrdered(this);
                if (!device.$$$isMobile(this) && discuss.$$$isOpen(this)) {
                    return visual;
                }
                if (!chatWindows.length) {
                    return visual;
                }
                const relativeGlobalWindowWidth = GLOBAL_WINDOW_WIDTH - START_GAP_WIDTH - END_GAP_WIDTH;
                let maxAmountWithoutHidden = Math.floor(
                    relativeGlobalWindowWidth / (CHAT_WINDOW_WIDTH + BETWEEN_GAP_WIDTH));
                let maxAmountWithHidden = Math.floor(
                    (relativeGlobalWindowWidth - HIDDEN_MENU_WIDTH - BETWEEN_GAP_WIDTH) /
                    (CHAT_WINDOW_WIDTH + BETWEEN_GAP_WIDTH));
                if (device.isMobile) {
                    maxAmountWithoutHidden = 1;
                    maxAmountWithHidden = 1;
                }
                if (chatWindows.length <= maxAmountWithoutHidden) {
                    // all visible
                    for (let i = 0; i < chatWindows.length; i++) {
                        const chatWindowLocalId = chatWindows[i].localId;
                        const offset = START_GAP_WIDTH + i * (CHAT_WINDOW_WIDTH + BETWEEN_GAP_WIDTH);
                        visual.visible.push({ chatWindowLocalId, offset });
                    }
                    visual.availableVisibleSlots = maxAmountWithoutHidden;
                } else if (maxAmountWithHidden > 0) {
                    // some visible, some hidden
                    for (let i = 0; i < maxAmountWithHidden; i++) {
                        const chatWindowLocalId = chatWindows[i].localId;
                        const offset = START_GAP_WIDTH + i * (CHAT_WINDOW_WIDTH + BETWEEN_GAP_WIDTH);
                        visual.visible.push({ chatWindowLocalId, offset });
                    }
                    if (chatWindows.length > maxAmountWithHidden) {
                        visual.hidden.isVisible = !device.isMobile;
                        visual.hidden.offset = visual.visible[maxAmountWithHidden - 1].offset
                            + CHAT_WINDOW_WIDTH + BETWEEN_GAP_WIDTH;
                    }
                    for (let j = maxAmountWithHidden; j < chatWindows.length; j++) {
                        visual.hidden.chatWindowLocalIds.push(chatWindows[j].localId);
                    }
                    visual.availableVisibleSlots = maxAmountWithHidden;
                } else {
                    // all hidden
                    visual.hidden.isVisible = !device.isMobile;
                    visual.hidden.offset = START_GAP_WIDTH;
                    visual.hidden.chatWindowLocalIds.concat(
                        chatWindows.map(chatWindow => chatWindow.localId)
                    );
                    console.warn('cannot display any visible chat windows (screen is too small)');
                    visual.availableVisibleSlots = 0;
                }
                return visual;
            },
            default: BASE_VISUAL,
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/chat-window-manager/chat-window-manager.js',
    actions,
    model,
);

});
