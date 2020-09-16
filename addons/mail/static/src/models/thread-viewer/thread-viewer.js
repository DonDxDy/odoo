odoo.define('mail/static/src/models/thread-viewer/thread-viewer.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/create': create,
    'Field/link': link,
    'Field/many2one': many2one,
    'Field/one2one': one2one,
    'Field/unlink': unlink,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ThreadViewer} threadViewer
     * @param {integer} scrollHeight
     */
    'ThreadViewer/saveThreadCacheScrollHeightAsInitial'(
        { env },
        threadViewer,
        scrollHeight
    ) {
        if (!threadViewer.$$$threadCache(this)) {
            return;
        }
        if (threadViewer.$$$chatter(this)) {
            // Initial scroll height is disabled for chatter because it is
            // too complex to handle correctly and less important
            // functionally.
            return;
        }
        env.invoke('Record/update', threadViewer, {
            $$$threadCacheInitialScrollHeights: {
                ...threadViewer.$$$threadCacheInitialScrollHeights(this),
                [threadViewer.$$$threadCache(this).localId]: scrollHeight,
            },
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {ThreadViewer} threadViewer
     * @param {integer} scrollTop
     */
    'ThreadViewer/saveThreadCacheScrollPositionsAsInitial'(
        { env },
        threadViewer,
        scrollTop
    ) {
        if (!threadViewer.$$$threadCache(this)) {
            return;
        }
        if (threadViewer.$$$chatter(this)) {
            // Initial scroll position is disabled for chatter because it is
            // too complex to handle correctly and less important
            // functionally.
            return;
        }
        env.invoke('Record/update', threadViewer, {
            $$$threadCacheInitialScrollPositions: {
                ...threadViewer.$$$threadCacheInitialScrollPositions(this),
                [threadViewer.$$$threadCache(this).localId]: scrollTop,
            },
        });
    },
});

const model = defineModel({
    name: 'ThreadViewer',
    fields: {
        /**
         * States the `Chatter` managing `this`. This field is computed
         * through the inverse relation and should be considered read-only.
         */
        $$$chatter: one2one('Chatter', {
            inverse: '$$$threadViewer',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$chatterHasThreadView: attr({
            related: '$$$chatter.$$$hasThreadView',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$chatterThread: many2one('Thread', {
            related: '$$$chatter.$$$thread',
        }),
        /**
         * States the `ChatWindow` managing `this`. This field is computed
         * through the inverse relation and should be considered read-only.
         */
        $$$chatWindow: one2one('ChatWindow', {
            inverse: '$$$threadViewer',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$chatWindowHasThreadView: attr({
            related: '$$$chatWindow.$$$hasThreadView',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$chatWindowThread: many2one('Thread', {
            related: '$$$chatWindow.$$$thread',
        }),
        /**
         * States the `Discuss` managing `this`. This field is computed
         * through the inverse relation and should be considered read-only.
         */
        $$$discuss: one2one('Discuss', {
            inverse: '$$$threadViewer',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$discussHasThreadView: attr({
            related: '$$$discuss.$$$hasThreadView',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$discussStringifiedDomain: attr({
            related: '$$$discuss.$$$stringifiedDomain',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$discussThread: many2one('Thread', {
            related: '$$$discuss.$$$thread',
        }),
        /**
         * Determines whether `this.thread` should be displayed.
         */
        $$$hasThreadView: attr({
            /**
             * @param {Object} param0
             * @param {ThreadViewer} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (record.$$$chatter(this)) {
                    return record.$$$chatter(this).$$$hasThreadView(this);
                }
                if (record.$$$chatWindow(this)) {
                    return record.$$$chatWindow(this).$$$hasThreadView(this);
                }
                if (record.$$$discuss(this)) {
                    return record.$$$discuss(this).$$$hasThreadView(this);
                }
                return record.$$$hasThreadView(this);
            },
            default: false,
        }),
        /**
         * Determines the domain to apply when fetching messages for `this.thread`.
         */
        $$$stringifiedDomain: attr({
            /**
             * @param {Object} param0
             * @param {ThreadViewer} param0.record
             * @returns {string}
             */
            compute({ record }) {
                if (record.$$$chatter(this)) {
                    return '[]';
                }
                if (record.$$$chatWindow(this)) {
                    return '[]';
                }
                if (record.$$$discuss(this)) {
                    return record.$$$discuss(this).$$$stringifiedDomain(this);
                }
                return record.$$$stringifiedDomain(this);
            },
            default: '[]',
        }),
        /**
         * Determines the `Thread` that should be displayed by `this`.
         */
        $$$thread: many2one('Thread', {
            /**
             * @param {Object} param0
             * @param {ThreadViewer} param0.record
             * @returns {Thread|undefined}
             */
            compute({ record }) {
                if (record.$$$chatter(this)) {
                    if (!record.$$$chatter(this).$$$thread(this)) {
                        return unlink();
                    }
                    return link(
                        record.$$$chatter(this).$$$thread(this)
                    );
                }
                if (record.$$$chatWindow(this)) {
                    if (!record.$$$chatWindow(this).$$$thread(this)) {
                        return unlink();
                    }
                    return link(
                        record.$$$chatWindow(this).$$$thread(this)
                    );
                }
                if (record.$$$discuss(this)) {
                    if (!record.$$$discuss(this).$$$thread(this)) {
                        return unlink();
                    }
                    return link(
                        record.$$$discuss(this).$$$thread(this)
                    );
                }
                return [];
            },
        }),
        /**
         * States the `ThreadCache` that should be displayed by `this`.
         */
        $$$threadCache: many2one('ThreadCache', {
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {ThreadViewer} param0.record
             * @returns {ThreadCache|undefined}
             */
            compute({ env, record }) {
                if (!record.$$$thread(this)) {
                    return unlink();
                }
                return link(
                    env.invoke('Thread/cache',
                        record.$$$thread(this),
                        record.$$$stringifiedDomain(this)
                    )
                );
            },
        }),
        /**
         * Determines the initial scroll height of thread caches, which is the
         * scroll height at the time the last scroll position was saved.
         * Useful to only restore scroll position when the corresponding height
         * is available, otherwise the restore makes no sense.
         */
        $$$threadCacheInitialScrollHeights: attr({
            default: {},
        }),
        /**
         * Determines the initial scroll positions of thread caches.
         * Useful to restore scroll position on changing back to this
         * thread cache. Note that this is only applied when opening
         * the thread cache, because scroll position may change fast so
         * save is already throttled.
         */
        $$$threadCacheInitialScrollPositions: attr({
            default: {},
        }),
        /**
         * States the `ThreadView` currently displayed and managed by `this`.
         */
        $$$threadView: one2one('ThreadView', {
            /**
             * @param {Object} param0
             * @param {ThreadViewer} param0.record
             * @returns {ThreadView|undefined}
             */
            compute({ record }) {
                if (!record.$$$hasThreadView(this)) {
                    return unlink();
                }
                if (record.$$$threadView(this)) {
                    return [];
                }
                return create();
            },
            inverse: '$$$threadViewer',
            isCausal: true,
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/thread-viewer/thread-viewer.js',
    actions,
    model,
);

});
