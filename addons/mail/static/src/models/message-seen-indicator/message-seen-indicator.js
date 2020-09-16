odoo.define('mail/static/src/models/message-seen-indicator/message-seen-indicator.js', function (require) {
'use strict';

const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/insert': insert,
    'Field/many2many': many2many,
    'Field/many2one': many2one,
    'Field/one2many': one2many,
    'Field/replace': replace,
    'Field/unlinkAll': unlinkAll,
} = require('mail/static/src/model/utils.js');

const actions = defineActions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} [channel] the concerned thread
     */
    'MessageSeenIndicator/recomputeFetchedValues'(
        { env },
        channel = undefined
    ) {
        const indicatorFindFunction = channel
            ? localIndicator => localIndicator.$$$thread() === channel
            : undefined;
        const indicators = env.invoke('MessageSeenIndicator/all', indicatorFindFunction);
        for (const indicator of indicators) {
            env.invoke('Record/update', indicator, {
                $$$hasEveryoneFetched:
                    env.invoke('MessageSeenIndicator/_computeHasEveryoneFetched', indicator),
                $$$hasSomeoneFetched:
                    env.invoke('MessageSeenIndicator/_computeHasSomeoneFetched', indicator),
                $$$partnersThatHaveFetched:
                    env.invoke('MessageSeenIndicator/_computePartnersThatHaveFetched', indicator),
            });
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Thread} [channel] the concerned thread
     */
    'MessageSeenIndicator/recomputeSeenValues'(
        { env },
        channel = undefined
    ) {
        const indicatorFindFunction = channel
            ? localIndicator => localIndicator.$$$thread() === channel
            : undefined;
        const indicators = env.invoke(
            'MessageSeenIndicator/all',
            indicatorFindFunction
        );
        for (const indicator of indicators) {
            env.invoke('Record/update', indicator, {
                $$$hasEveryoneSeen:
                    env.invoke(
                        'MessageSeenIndicator/_computeHasEveryoneSeen',
                        indicator
                    ),
                $$$hasSomeoneFetched:
                    env.invoke(
                        'MessageSeenIndicator/_computeHasSomeoneFetched',
                        indicator
                    ),
                $$$hasSomeoneSeen:
                    env.invoke(
                        'MessageSeenIndicator/_computeHasSomeoneSeen',
                        indicator
                    ),
                $$$isMessagePreviousToLastCurrentPartnerMessageSeenByEveryone:
                    env.invoke(
                        'MessageSeenIndicator/_computeIsMessagePreviousToLastCurrentPartnerMessageSeenByEveryone',
                        indicator
                    ),
                $$$partnersThatHaveFetched:
                    env.invoke(
                        'MessageSeenIndicator/_computePartnersThatHaveFetched',
                        indicator
                    ),
                $$$partnersThatHaveSeen:
                    env.invoke(
                        'MessageSeenIndicator/_computePartnersThatHaveSeen',
                        indicator
                    ),
            });
        }
    },
});

const model = defineModel({
    name: 'MessageSeenIndicator',
    fields: {
        /**
         * The id of the channel this seen indicator is related to.
         *
         * Should write on this field to set relation between the channel and
         * this seen indicator, not on `thread`.
         *
         * Reason for not setting the relation directly is the necessity to
         * uniquely identify a seen indicator based on channel and message from data.
         * Relational data are list of commands, which is problematic to deduce
         * identifying records.
         *
         * TODO: task-2322536 (normalize relational data) & task-2323665
         * (required fields) should improve and let us just use the relational
         * fields.
         */
        $$$channelId: attr({
            id: true,
        }),
        $$$hasEveryoneFetched: attr({
            /**
             * Manually called as not always called when necessary
             * @see MessageSeenIndicator/computeFetchedValues
             * @see MessageSeenIndicator/computeSseenValues
             *
             * @param {Object} param0
             * @param {MessageSeenIndicator} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (
                    !record.$$$message(this) ||
                    !record.$$$thread(this) ||
                    !record.$$$thread(this).$$$partnerSeenInfos(this)
                ) {
                    return false;
                }
                const otherPartnerSeenInfosDidNotFetch =
                    record
                        .$$$thread(this)
                        .$$$partnerSeenInfos(this)
                        .filter(partnerSeenInfo =>
                            (
                                partnerSeenInfo.$$$partner(this) !==
                                record.$$$message(this).$$$author(this)
                            ) &&
                            (
                                !partnerSeenInfo.$$$lastFetchedMessage(this) ||
                                (
                                    partnerSeenInfo.$$$lastFetchedMessage(this).$$$id(this) <
                                    record.$$$message(this).$$$id(this)
                                )
                            )
                        );
                return otherPartnerSeenInfosDidNotFetch.length === 0;
            },
            default: false,
        }),
        $$$hasEveryoneSeen: attr({
            /**
             * Manually called as not always called when necessary
             * @see MessageSeenIndicator/computeSeenValues
             *
             * @param {Object} param0
             * @param {MessageSeenIndicator} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (
                    !record.$$$message(this) ||
                    !record.$$$thread(this) ||
                    !record.$$$thread(this).$$$partnerSeenInfos(this)
                ) {
                    return false;
                }
                const otherPartnerSeenInfosDidNotSee =
                    record
                        .$$$thread(this)
                        .$$$partnerSeenInfos(this)
                        .filter(partnerSeenInfo =>
                            (
                                partnerSeenInfo.$$$partner(this) !==
                                record.$$$message(this).$$$author(this)
                            ) &&
                            (
                                !partnerSeenInfo.$$$lastSeenMessage(this) ||
                                (
                                    partnerSeenInfo.$$$lastSeenMessage(this).$$$id(this) <
                                    record.$$$message(this).$$$id(this)
                                )
                            )
                        );
                return otherPartnerSeenInfosDidNotSee.length === 0;
            },
            default: false,
        }),
        $$$hasSomeoneFetched: attr({
            /**
             * Manually called as not always called when necessary
             * @see MessageSeenIndicator/computeFetchedValues
             * @see MessageSeenIndicator/computeSeenValues
             *
             * @param {Object} param0
             * @param {MessageSeenIndicator} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (
                    !record.$$$message(this) ||
                    !record.$$$thread(this) ||
                    !record.$$$thread(this).$$$partnerSeenInfos(this)
                ) {
                    return false;
                }
                const otherPartnerSeenInfosFetched =
                    record
                        .$$$thread(this)
                        .$$$partnerSeenInfos(this)
                        .filter(partnerSeenInfo =>
                            (
                                partnerSeenInfo.$$$partner(this) !==
                                record.$$$message(this).$$$author(this)
                            ) &&
                            partnerSeenInfo.$$$lastFetchedMessage(this) &&
                            (
                                partnerSeenInfo.$$$lastFetchedMessage(this).$$$id(this) >=
                                record.$$$message(this).$$$id(this)
                            )
                        );
                return otherPartnerSeenInfosFetched.length > 0;
            },
            default: false,
        }),
        $$$hasSomeoneSeen: attr({
            /**
             * Manually called as not always called when necessary
             * @see MessageSeenIndicator/computeSeenValues
             *
             * @param {Object} param0
             * @param {MessageSeenIndicator} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (
                    !record.$$$message(this) ||
                    !record.$$$thread(this) ||
                    !record.$$$thread(this).$$$partnerSeenInfos(this)
                ) {
                    return false;
                }
                const otherPartnerSeenInfosSeen =
                    record
                        .$$$thread(this)
                        .$$$partnerSeenInfos(this)
                        .filter(partnerSeenInfo =>
                            (
                                partnerSeenInfo.$$$partner(this) !==
                                record.$$$message(this).$$$author(this)
                            ) &&
                            partnerSeenInfo.$$$lastSeenMessage(this) &&
                            (
                                partnerSeenInfo.$$$lastSeenMessage(this).$$$id(this) >=
                                record.$$$message(this).$$$id(this)
                            )
                        );
                return otherPartnerSeenInfosSeen.length > 0;
            },
            default: false,
        }),
        $$$id: attr(),
        $$$isMessagePreviousToLastCurrentPartnerMessageSeenByEveryone: attr({
            /**
             * Manually called as not always called when necessary
             * @see MessageSeenIndicator/computeSeenValues
             *
             * @param {Object} param0
             * @param {MessageSeenIndicator} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (
                    !record.$$$message(this) ||
                    !record.$$$thread(this) ||
                    !record.$$$thread(this).$$$lastCurrentPartnerMessageSeenByEveryone(this)
                ) {
                    return false;
                }
                return (
                    record.$$$message(this).$$$id(this) <
                    record.$$$thread(this).$$$lastCurrentPartnerMessageSeenByEveryone(this).$$$id(this)
                );
            },
            default: false,
        }),
        /**
         * The message concerned by this seen indicator.
         * This is automatically computed based on messageId field.
         * @see MessageSeenIndicator:messageId
         */
        $$$message: many2one('Message', {
            /**
             * @param {Object} param0
             * @param {MessageSeenIndicator} param0.record
             * @returns {Message}
             */
            compute({ record }) {
                return insert({
                    $$$id: record.$$$messageId(this),
                });
            }
        }),
        $$$messageAuthor: many2one('Partner', {
            related: '$$$message.$$$author',
        }),
        /**
         * The id of the message this seen indicator is related to.
         *
         * Should write on this field to set relation between the channel and
         * this seen indicator, not on `message`.
         *
         * Reason for not setting the relation directly is the necessity to
         * uniquely identify a seen indicator based on channel and message from data.
         * Relational data are list of commands, which is problematic to deduce
         * identifying records.
         *
         * TODO: task-2322536 (normalize relational data) & task-2323665
         * (required fields) should improve and let us just use the relational
         * fields.
         */
        $$$messageId: attr({
            id: true,
        }),
        $$$partnersThatHaveFetched: many2many('Partner', {
            /**
             * Manually called as not always called when necessary
             * @see MessageSeenIndicator/computeFetchedValues
             * @see MessageSeenIndicator/computeSeenValues
             *
             * @param {Object} param0
             * @param {MessageSeenIndicator} param0.record
             * @returns {Partner[]}
             */
            compute({ record }) {
                if (
                    !record.$$$message(this) ||
                    !record.$$$thread(this) ||
                    !record.$$$thread(this).$$$partnerSeenInfos(this)
                ) {
                    return unlinkAll();
                }
                const otherPartnersThatHaveFetched = record.$$$thread(this).$$$partnerSeenInfos(this)
                    .filter(partnerSeenInfo =>
                        /**
                         * Relation may not be set yet immediately
                         * @see ThreadPartnerSeenInfo:partnerId field
                         * FIXME task-2278551
                         */
                        partnerSeenInfo.$$$partner(this) &&
                        (
                            partnerSeenInfo.$$$partner(this) !==
                            record.$$$message(this).$$$author(this)
                        ) &&
                        partnerSeenInfo.$$$lastFetchedMessage(this) &&
                        (
                            partnerSeenInfo.$$$lastFetchedMessage(this).$$$id(this) >=
                            record.$$$message(this).$$$id(this)
                        )
                    )
                    .map(partnerSeenInfo => partnerSeenInfo.$$$partner(this));
                if (otherPartnersThatHaveFetched.length === 0) {
                    return unlinkAll();
                }
                return replace(otherPartnersThatHaveFetched);
            }
        }),
        $$$partnersThatHaveSeen: many2many('Partner', {
            /**
             * Manually called as not always called when necessary
             * @see MessageSeenIndicator/computeSeenValues
             *
             * @param {Object} param0
             * @param {MessageSeenIndicator} param0.record
             * @returns {Partner[]}
             */
            compute({ record }) {
                if (
                    !record.$$$message(this) ||
                    !record.$$$thread(this) ||
                    !record.$$$thread(this).$$$partnerSeenInfos(this)
                ) {
                    return unlinkAll();
                }
                const otherPartnersThatHaveSeen = record.$$$thread(this).$$$partnerSeenInfos(this)
                    .filter(partnerSeenInfo =>
                        /**
                         * Relation may not be set yet immediately
                         * @see ThreadPartnerSeenInfo:partnerId field
                         * FIXME task-2278551
                         */
                        partnerSeenInfo.$$$partner(this) &&
                        (
                            partnerSeenInfo.$$$partner(this) !==
                            record.$$$message(this).$$$author(this)
                        ) &&
                        partnerSeenInfo.$$$lastSeenMessage(this) &&
                        (
                            partnerSeenInfo.$$$lastSeenMessage(this).$$$id(this) >=
                            record.$$$message(this).$$$id(this)
                        )
                    )
                    .map(partnerSeenInfo => partnerSeenInfo.$$$partner(this));
                if (otherPartnersThatHaveSeen.length === 0) {
                    return unlinkAll();
                }
                return replace(otherPartnersThatHaveSeen);
            },
        }),
        /**
         * The thread concerned by this seen indicator.
         * This is automatically computed based on channelId field.
         * @see channelId
         */
        $$$thread: many2one('Thread', {
            /**
             * @param {Object} param0
             * @param {MessageSeenIndicator} param0.record
             * @returns {Thread}
             */
            compute({ record }) {
                return insert({
                    $$$id: record.$$$channelId(this),
                    $$$model: 'mail.channel',
                });
            },
            inverse: '$$$messageSeenIndicators'
        }),
        $$$threadPartnerSeenInfos: one2many('ThreadPartnerSeenInfo', {
            related: '$$$thread.$$$partnerSeenInfos',
        }),
        $$$threadLastCurrentPartnerMessageSeenByEveryone: many2one('Message', {
            related: '$$$thread.$$$lastCurrentPartnerMessageSeenByEveryone',
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/message-seen-indicator/message-seen-indicator.js',
    actions,
    model,
);

});
