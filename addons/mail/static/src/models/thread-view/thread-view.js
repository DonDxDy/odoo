odoo.define('mail/static/src/models/thread-view/thread-view.js', function (require) {
'use strict';

const {
    RecordDeletedError,
} = require('mail/static/src/model/errors.js');
const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/clear': clear,
    'Field/link': link,
    'Field/many2many': many2many,
    'Field/many2one': many2one,
    'Field/one2one': one2one,
    'Field/unlink': unlink,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * This function register a hint for the component related to this
     * record. Hints are information on changes around this viewer that
     * make require adjustment on the component. For instance, if this
     * ThreadView initiated a thread cache load and it now has become
     * loaded, then it may need to auto-scroll to last message.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ThreadView} threadView
     * @param {string} hintType name of the hint. Used to determine what's
     *   the broad type of adjustement the component has to do.
     * @param {any} [hintData] data of the hint. Used to fine-tune
     *   adjustments on the component.
     */
    'ThreadView/addComponentHint'(
        { env },
        threadView,
        hintType,
        hintData
    ) {
        const hint = {
            data: hintData,
            type: hintType,
        };
        env.invoke('Record/update', threadView, {
            $$$componentHintList: threadView.$$$componentHintList(this).concat([hint]),
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ThreadView} threadView
     * @param {Message} message
     */
    'ThreadView/handleVisibleMessage'(
        { env },
        threadView,
        message
    ) {
        if (
            !threadView.$$$lastVisibleMessage(this) ||
            threadView.$$$lastVisibleMessage(this).$$$id(this) < message.$$$id(this)
        ) {
            env.invoke('Record/update', threadView, {
                $$$lastVisibleMessage: link(message),
            });
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ThreadView} threadView
     * @param {Object} hint
     */
    'ThreadView/markComponentHintProcessed'(
        { env },
        threadView,
        hint
    ) {
        let filterFun;
        switch (hint.type) {
            case 'message-received':
                filterFun = h => h.type !== hint.type && h.message !== hint.data.message;
                break;
            default:
                filterFun = h => h.type !== hint.type;
                break;
        }
        env.invoke('Record/update', threadView, {
            $$$componentHintList: threadView.$$$componentHintList(this).filter(filterFun),
        });
        env.messagingBus.trigger('o-thread-view-hint-processed', {
            hint,
            threadViewer: threadView.$$$threadViewer(this),
        });
    },
});

const model = defineModel({
    name: 'ThreadView',
    fields: {
        $$$checkedMessages: many2many('Message', {
            related: '$$$threadCache.$$$checkedMessages',
        }),
        /**
         * List of component hints. Hints contain information that help
         * components make UI/UX decisions based on their UI state.
         * For instance, on receiving new messages and the last message
         * is visible, it should auto-scroll to this new last message.
         *
         * Format of a component hint:
         *
         *   {
         *       type: {string} the name of the component hint. Useful
         *                      for components to dispatch behaviour
         *                      based on its type.
         *       data: {Object} data related to the component hint.
         *                      For instance, if hint suggests to scroll
         *                      to a certain message, data may contain
         *                      message id.
         *   }
         */
        $$$componentHintList: attr({
            default: [],
        }),
        $$$composer: many2one('Composer', {
            related: '$$$thread.$$$composer',
        }),
        $$$hasComposerFocus: attr({
            related: '$$$composer.$$$hasFocus',
        }),
        /**
         * States whether `this.threadCache` is currently loading messages.
         *
         * This field is related to `this.threadCache.isLoading` but with a
         * delay on its update to avoid flickering on the UI.
         *
         * It is computed through `_onThreadCacheIsLoadingChanged` and it should
         * otherwise be considered read-only.
         */
        $$$isLoading: attr({
            default: false,
        }),
        /**
         * States whether `this` is aware of `this.threadCache` currently
         * loading messages, but `this` is not yet ready to display that loading
         * on the UI.
         *
         * This field is computed through `_onThreadCacheIsLoadingChanged` and
         * it should otherwise be considered read-only.
         *
         * @see `isLoading`
         */
        $$$isPreparingLoading: attr({
            default: false,
        }),
        /**
         * Determines whether `this` should automatically scroll on receiving
         * a new message. Detection of new message is done through the component
         * hint `message-received`.
         */
        $$$hasAutoScrollOnMessageReceived: attr(),
        /**
             * Last message in the context of the currently displayed thread cache.
             */
        $$$lastMessage: many2one('Message', {
            related: '$$$thread.$$$lastMessage',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$lastNonTransientMessage: many2one('Message', {
            related: '$$$thread.$$$lastNonTransientMessage',
        }),
        /**
         * Most recent message in this ThreadView that has been shown to the
         * current partner in the currently displayed thread cache.
         */
        $$$lastVisibleMessage: many2one('Message'),
        $$$messages: many2many('Message', {
            related: '$$$threadCache.$$$messages',
        }),
        $$$nonEmptyMessages: many2many('Message', {
            related: '$$$threadCache.$$$nonEmptyMessages',
        }),
        /**
         * Not a real field, used to trigger `_onThreadCacheChanged` when one of
         * the dependencies changes.
         */
        $$$onThreadCacheChanged: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ThreadView} param0.record
             */
            compute({ env, record }) {
                env.invoke('ThreadView/addComponentHint',
                    record,
                    'change-of-thread-cache'
                );
                if (record.$$$threadCache(this)) {
                    env.invoke('Record/update',
                        record.$$$threadCache(this),
                        {
                            $$$isCacheRefreshRequested: true,
                        }
                    );
                }
                env.invoke('Record/update', record, {
                    $$$lastVisibleMessage: unlink(),
                });
            },
            dependencies: [
                'threadCache'
            ],
        }),
        /**
         * Not a real field, used to trigger `_onThreadCacheIsLoadingChanged`
         * when one of the dependencies changes.
         *
         * @see `isLoading`
         */
        $$$onThreadCacheIsLoadingChanged: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ThreadView} param0.record
             */
            compute({ env, record }) {
                if (
                    record.$$$threadCache(this) &&
                    record.$$$threadCache(this).$$$isLoading(this)
                ) {
                    if (
                        !record.$$$isLoading(this) &&
                        !record.$$$isPreparingLoading(this)
                    ) {
                        env.invoke('Record/update', record, {
                            $$$isPreparingLoading: true,
                        });
                        env.invoke(
                            'Record/doAsync',
                            record,
                            () => new Promise(resolve => {
                                record._loaderTimeout = env.browser.setTimeout(resolve, 400);
                            }
                        ))
                        .then(() => {
                            const isLoading = record.$$$threadCache(this)
                                ? record.$$$threadCache(this).$$$isLoading(this)
                                : false;
                            env.invoke('Record/update', record, {
                                $$$isLoading: isLoading,
                                $$$isPreparingLoading: false,
                            });
                        });
                    }
                    return;
                }
                env.browser.clearTimeout(record._loaderTimeout);
                env.invoke('Record/update', record, {
                    $$$isLoading: false,
                    $$$isPreparingLoading: false,
                });
            },
            dependencies: [
                'threadCache',
                'threadCacheIsLoading',
            ],
        }),
        /**
         * Not a real field, used to trigger `thread.markAsSeen` when one of
         * the dependencies changes.
         */
        $$$onThreadShouldBeSetAsSeen: attr({
            /**
             * Not a real field, used to trigger `thread.markAsSeen` when one of
             * the dependencies changes.
             *
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ThreadView} param0.record
             */
            compute({ env, record }) {
                if (!record.$$$thread(this)) {
                    return;
                }
                if (!record.$$$thread(this).$$$lastNonTransientMessage(this)) {
                    return;
                }
                if (!record.$$$lastVisibleMessage(this)) {
                    return;
                }
                if (
                    !record.$$$lastVisibleMessage(this) !==
                    record.$$$lastMessage(this)
                ) {
                    return;
                }
                if (!record.$$$hasComposerFocus(this)) {
                    // FIXME condition should not be on "composer is focused" but "threadView is active"
                    // See task-2277543
                    return;
                }
                env.invoke('Thread/markAsSeen',
                    record.$$$thread(this),
                    record.$$$thread(this).$$$lastNonTransientMessage(this)
                )
                .catch(e => {
                    // prevent crash when executing compute during destroy
                    if (!(e instanceof RecordDeletedError)) {
                        throw e;
                    }
                });
            },
            dependencies: [
                '$$$hasComposerFocus',
                '$$$lastMessage',
                '$$$lastNonTransientMessage',
                '$$$lastVisibleMessage',
                '$$$threadCache',
            ],
        }),
        /**
         * Determines the domain to apply when fetching messages for `this.thread`.
         */
        $$$stringifiedDomain: attr({
            related: '$$$threadViewer.$$$stringifiedDomain',
        }),
        /**
         * Determines the `Thread` currently displayed by `this`.
         */
        $$$thread: many2one('Thread', {
            inverse: '$$$threadViews',
            related: '$$$threadViewer.$$$thread',
        }),
        /**
         * States the `ThreadCache` currently displayed by `this`.
         */
        $$$threadCache: many2one('ThreadCache', {
            inverse: '$$$threadViews',
            related: '$$$threadViewer.$$$threadCache',
        }),
        $$$threadCacheInitialScrollHeight: attr({
            /**
             * @param {Object} param0
             * @param {ThreadView} param0.record
             * @returns {integer|undefined}
             */
            compute({ record }) {
                if (!record.$$$threadCache(this)) {
                    return clear();
                }
                const threadCacheInitialScrollHeight = record.threadCacheInitialScrollHeights[
                    record.$$$threadCache(this).localId
                ](this);
                if (threadCacheInitialScrollHeight !== undefined) {
                    return threadCacheInitialScrollHeight;
                }
                return clear();
            },
        }),
        $$$threadCacheInitialScrollPosition: attr({
            /**
             * @param {Object} param0
             * @param {ThreadView} param0.record
             * @returns {integer|undefined}
             */
            compute({ record }) {
                if (!record.$$$threadCache(this)) {
                    return clear();
                }
                const threadCacheInitialScrollPosition = record.$$$threadCacheInitialScrollPositions(this)[
                    record.$$$threadCache(this).localId
                ];
                if (threadCacheInitialScrollPosition !== undefined) {
                    return threadCacheInitialScrollPosition;
                }
                return clear();
            },
        }),
        /**
         * Serves as compute dependency.
         */
        $$$threadCacheIsLoading: attr({
            related: '$$$threadCache.$$$isLoading',
        }),
        /**
         * List of saved initial scroll heights of thread caches.
         */
        $$$threadCacheInitialScrollHeights: attr({
            default: {},
            related: '$$$threadViewer.$$$threadCacheInitialScrollHeights',
        }),
        /**
         * List of saved initial scroll positions of thread caches.
         */
        $$$threadCacheInitialScrollPositions: attr({
            default: {},
            related: '$$$threadViewer.$$$threadCacheInitialScrollPositions',
        }),
        /**
         * Determines the `ThreadViewer` currently managing `this`.
         */
        $$$threadViewer: one2one('ThreadView', {
            inverse: '$$$threadView',
        }),
        $$$uncheckedMessages: many2many('Message', {
            related: '$$$threadCache.$$$uncheckedMessages',
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/thread-view/thread-view.js',
    actions,
    model,
);

});
