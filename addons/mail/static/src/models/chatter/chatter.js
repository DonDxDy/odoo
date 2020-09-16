odoo.define('mail/static/src/models/chatter/chatter.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/create': create,
    'Field/insert': insert,
    'Field/link': link,
    'Field/many2one': many2one,
    'Field/one2one': one2one,
} = require('mail/static/src/model/utils.js');

const getThreadNextTemporaryId = (function () {
    let tmpId = 0;
    return () => {
        tmpId -= 1;
        return tmpId;
    };
})();

const getMessageNextTemporaryId = (function () {
    let tmpId = 0;
    return () => {
        tmpId -= 1;
        return tmpId;
    };
})();

const actions = defineActions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Chatter} chatter
     */
    'Chatter/focus'(
        { env },
        chatter
    ) {
        env.invoke('Record/update', chatter, {
            $$$isDoFocus: true,
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Chatter} chatter
     */
    async 'Chatter/refresh'(
        { env },
        chatter
    ) {
        if (chatter.$$$hasActivities(this)) {
            env.invoke('Thread/refreshActivities',
                chatter.$$$thread(this)
            );
        }
        if (chatter.$$$hasFollowers(this)) {
            env.invoke('Thread/refreshFollowers',
                chatter.$$$thread(this)
            );
            env.invoke('Thread/fetchAndUpdateSuggestedRecipients',
                chatter.$$$thread(this)
            );
        }
        if (chatter.$$$hasMessageList(this)) {
            env.invoke('Thread/refresh',
                chatter.$$$thread(this)
            );
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Chatter} chatter
     */
    'Chatter/showLogNote'(
        { env },
        chatter
    ) {
        env.invoke('Record/update', chatter, {
            $$$isComposerVisible: true,
        });
        env.invoke('Record/update',
            chatter.$$$thread(this).$$$composer(this),
            {
                $$$isLog: true,
            }
        );
        env.invoke('Chatter/focus', chatter);
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Chatter} chatter
     */
    'Chatter/showSendMessage'(
        { env },
        chatter
    ) {
        env.invoke('Record/update', chatter, {
            $$$isComposerVisible: true,
        });
        env.invoke('Record/update',
            chatter.$$$thread(this).$$$composer(this),
            {
                $$$isLog: false,
            }
        );
        env.invoke('Chatter/focus', chatter);
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Chatter} chatter
     */
    'Chatter/toggleActivityBoxVisibility'(
        { env },
        chatter
    ) {
        env.invoke('Record/update', chatter, {
            $$$isActivityBoxVisible: !chatter.$$$isActivityBoxVisible(this),
        });
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Chatter} chatter
     */
    'Chatter/_prepareAttachmentsLoading'(
        { env },
        chatter
    ) {
        chatter._isPreparingAttachmentsLoading = true;
        chatter._attachmentsLoaderTimeout = env.browser.setTimeout(() => {
            env.invoke('Record/update', chatter, {
                $$$isShowingAttachmentsLoading: true,
            });
            chatter._isPreparingAttachmentsLoading = false;
        }, env.loadingBaseDelayDuration);
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Chatter} chatter
     */
    'Chatter/_stopAttachmentsLoading'(
        { env },
        chatter
    ) {
        env.browser.clearTimeout(chatter._attachmentsLoaderTimeout);
        chatter._attachmentsLoaderTimeout = null;
        env.invoke('Record/update', chatter, {
            $$$isShowingAttachmentsLoading: false,
        });
        chatter._isPreparingAttachmentsLoading = false;
    },
});

const model = defineModel({
    name: 'Chatter',
    fields: {
        $$$composer: many2one('Composer', {
            related: '$$$thread.$$$composer',
        }),
        $$$context: attr({
            default: {},
        }),
        /**
         * Determines whether `this` should display an activity box.
         */
        $$$hasActivities: attr({
            default: true,
        }),
        $$$hasExternalBorder: attr({
            default: true,
        }),
        /**
         * Determines whether `this` should display followers menu.
         */
        $$$hasFollowers: attr({
            default: true,
        }),
        /**
         * Determines whether `this` should display a message list.
         */
        $$$hasMessageList: attr({
            default: true,
        }),
        /**
         * Whether the message list should manage its scroll.
         * In particular, when the chatter is on the form view's side,
         * then the scroll is managed by the message list.
         * Also, the message list shoud not manage the scroll if it shares it
         * with the rest of the page.
         */
        $$$hasMessageListScrollAdjust: attr({
            default: false,
        }),
        /**
         * Determines whether `this.thread` should be displayed.
         */
        $$$hasThreadView: attr({
            /**
             * @param {Object} param0
             * @param {Chatter} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return (
                    record.$$$thread(this) &&
                    record.$$$hasMessageList(this)
                );
            },
        }),
        $$$hasTopbarCloseButton: attr({
            default: false,
        }),
        $$$isActivityBoxVisible: attr({
            default: true,
        }),
        /**
         * Determiners whether the attachment box is currently visible.
         */
        $$$isAttachmentBoxVisible: attr({
            default: false,
        }),
        /**
         * Determiners whether the attachment box is visible initially.
         */
        $$$isAttachmentBoxVisibleInitially: attr({
            default: false,
        }),
        $$$isComposerVisible: attr({
            default: false,
        }),
        $$$isDisabled: attr({
            /**
             * @param {Object} param0
             * @param {Chatter} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return (
                    !record.$$$thread(this) ||
                    record.$$$thread(this).$$$isTemporary(this)
                );
            },
            default: false,
        }),
        /**
         * Determine whether this chatter should be focused at next render.
         */
        $$$isDoFocus: attr({
            default: false,
        }),
        $$$isShowingAttachmentsLoading: attr({
            default: false,
        }),
        /**
         * Not a real field, used to trigger its compute method when one of the
         * dependencies changes.
         */
        $$$onThreadIdOrThreadModelChanged: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Chatter} param0.record
             */
            compute({ env, record }) {
                if (record.$$$threadId(this)) {
                    if (
                        record.$$$thread(this) &&
                        record.$$$thread(this).$$$isTemporary(this)
                    ) {
                        env.invoke('Record/delete', record.$$$thread(this));
                    }
                    env.invoke('Record/update', record, {
                        $$$isAttachmentBoxVisible:
                            record.$$$isAttachmentBoxVisibleInitially(this),
                        $$$thread: insert({
                            // If the thread was considered to have the activity
                            // mixin once, it will have it forever.
                            $$$hasActivities: record.$$$hasActivities(this)
                                ? true
                                : undefined,
                            $$$id: record.$$$threadId(this),
                            $$$model: record.$$$threadModel(this),
                        }),
                    });
                    if (record.$$$hasActivities(this)) {
                        env.invoke(
                            'Thread/refreshActivities',
                            record.$$$thread(this)
                        );
                    }
                    if (record.$$$hasFollowers(this)) {
                        env.invoke(
                            'Thread/refreshFollowers',
                            record.$$$thread(this)
                        );
                        env.invoke(
                            'Thread/fetchAndUpdateSuggestedRecipients',
                            record.$$$thread(this)
                        );
                    }
                    if (record.$$$hasMessageList(this)) {
                        env.invoke('Thread/refresh', record.$$$thread(this));
                    }
                } else if (
                    !record.$$$thread(this) ||
                    !record.$$$thread(this).$$$isTemporary(this)
                ) {
                    const currentPartner = env.messaging.$$$currentPartner(this);
                    const message = env.invoke('Message/create', {
                        $$$author: link(currentPartner),
                        $$$body: env._t("Creating a new record..."),
                        $$$id: getMessageNextTemporaryId(),
                        $$$isTemporary: true,
                    });
                    const nextId = getThreadNextTemporaryId();
                    env.invoke('Record/update', record, {
                        $$$isAttachmentBoxVisible: false,
                        $$$thread: insert({
                            $$$areAttachmentsLoaded: true,
                            $$$id: nextId,
                            $$$isTemporary: true,
                            $$$model: record.$$$threadModel(this),
                        }),
                    });
                    for (const cache of record.$$$thread(this).$$$caches(this)) {
                        env.invoke('Record/update', cache, {
                            $$$messages: link(message),
                        });
                    }
                }
            },
            dependencies: [
                'threadId',
                'threadModel',
            ],
        }),
        /**
         * Not a real field, used to trigger its compute method when one of the
         * dependencies changes.
         */
        $$$onThreadIsLoadingAttachmentsChanged: attr({
            /**
             * @param {Object} param0
             * @param {web.env} param0.env
             * @param {Chatter} param0.record
             */
            compute({ env, record }) {
                if (!record.$$$thread(this).$$$isLoadingAttachments(this)) {
                    env.invoke('Chatter/_stopAttachmentsLoading', record);
                    return;
                }
                if (
                    record._isPreparingAttachmentsLoading ||
                    record.$$$isShowingAttachmentsLoading(this)
                ) {
                    return;
                }
                env.invoke('Chatter/_prepareAttachmentsLoading', record);
            },
            dependencies: [
                'threadIsLoadingAttachments',
            ],
        }),
        /**
         * Determines the `Thread` that should be displayed by `this`.
         */
        $$$thread: many2one('Thread'),
        /**
         * Determines the id of the thread that will be displayed by `this`.
         */
        $$$threadId: attr(),
        /**
         * Serves as compute dependency.
         */
        $$$threadIsLoadingAttachments: attr({
            related: '$$$thread.$$$isLoadingAttachments',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$threadIsTemporary: attr({
            related: '$$$thread.$$$isTemporary',
        }),
        /**
         * Determines the model of the thread that will be displayed by `this`.
         */
        $$$threadModel: attr(),
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
            inverse: '$$$chatter',
            isCausal: true,
            readonly: true,
        }),
    },
    lifecycles: {
        /**
         * @param {Object} param0
         * @param {Object} param0.env
         * @param {Object} param0.record
         */
        onDelete({ env, record }) {
            env.invoke('Chatter/_stopAttachmentsLoading', record);
        }
    },
});

return defineFeatureSlice(
    'mail/static/src/models/chatter/chatter.js',
    actions,
    model
);

});
