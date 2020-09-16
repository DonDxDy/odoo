odoo.define('mail/static/src/models/composer/composer.js', function (require) {
'use strict';

const emojis = require('mail.emojis');
const {
    'Feature/defineActions': defineActions,
    'Feature/defineModel': defineModel,
    'Feature/defineSlice': defineFeatureSlice,
    'Field/attr': attr,
    'Field/clear': clear,
    'Field/insert': insert,
    'Field/insertAndReplace': insertAndReplace,
    'Field/link': link,
    'Field/many2many': many2many,
    'Field/many2one': many2one,
    'Field/one2one': one2one,
    'Field/replace': replace,
    'Field/unlink': unlink,
    'Field/unlinkAll': unlinkAll,
} = require('mail/static/src/model/utils.js');
const {
    addLink,
    escapeAndCompactTextContent,
    parseAndTransform,
} = require('mail.utils');

const actions = defineActions({
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    'Composer/closeSuggestions'(
        { env },
        composer
    ) {
        if (composer.$$$activeSuggestedRecordName(this)) {
            env.invoke('Record/update', composer, {
                [composer.$$$activeSuggestedRecordName(this)]: unlink(),
            });
        }
        if (composer.$$$extraSuggestedRecordsListName(this)) {
            env.invoke('Record/update', composer, {
                [composer.$$$extraSuggestedRecordsListName(this)]: unlinkAll(),
            });
        }
        if (composer.$$$mainSuggestedRecordsListName(this)) {
            env.invoke('Record/update', composer, {
                [composer.$$$mainSuggestedRecordsListName(this)]: unlinkAll(),
            });
        }
        env.invoke('Record/update', composer, {
            $$$activeSuggestedRecordName: clear(),
            $$$extraSuggestedRecordsListName: '',
            $$$mainSuggestedRecordsListName: '',
            $$$suggestionDelimiter: '',
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    'Composer/detectSuggestionDelimiter'(
        { env },
        composer
    ) {
        if (
            composer.$$$textInputCursorStart(this) !==
            composer.$$$textInputCursorEnd(this)
        ) {
            return;
        }
        const lastInputChar = composer.$$$textInputContent(this).substring(
            composer.$$$textInputCursorStart(this) - 1,
            composer.$$$textInputCursorStart(this)
        );
        const suggestionDelimiters = ['@', ':', '#', '/'];
        if (
            suggestionDelimiters.includes(lastInputChar) &&
            !composer.$$$hasSuggestions(this)
        ) {
            env.invoke('Record/update', composer, {
                $$$suggestionDelimiter: lastInputChar,
            });
        }
        const mentionKeyword = env.invoke(
            'Composer/_validateMentionKeyword',
            composer,
            false
        );
        if (mentionKeyword !== false) {
            switch (composer.$$$suggestionDelimiter(this)) {
                case '@':
                    env.invoke('Record/update', composer, {
                        $$$activeSuggestedRecordName: '$$$activeSuggestedPartner',
                        $$$extraSuggestedRecordsListName: '$$$extraSuggestedPartners',
                        $$$mainSuggestedRecordsListName: '$$$mainSuggestedPartners',
                        $$$suggestionModelName: 'Partner',
                    });
                    env.invoke(
                        'Composer/_updateSuggestedPartners',
                        composer,
                        mentionKeyword
                    );
                    break;
                case ':':
                    env.invoke('Record/update', composer, {
                        $$$activeSuggestedRecordName: '$$$activeSuggestedCannedResponse',
                        $$$mainSuggestedRecordsListName: '$$$suggestedCannedResponses',
                        $$$suggestionModelName: 'CannedResponse',
                    });
                    env.invoke(
                        'Composer/_updateSuggestedCannedResponses',
                        composer,
                        mentionKeyword
                    );
                    break;
                case '/':
                    env.invoke('Record/update', composer, {
                        $$$activeSuggestedRecordName: '$$$activeSuggestedChannelCommand',
                        $$$mainSuggestedRecordsListName: '$$$suggestedChannelCommands',
                        $$$suggestionModelName: 'ChannelCommand',
                    });
                    env.invoke(
                        'Composer/_updateSuggestedChannelCommands',
                        composer,
                        mentionKeyword
                    );
                    break;
                case '#':
                    env.invoke('Record/update', composer, {
                        $$$activeSuggestedRecordName: '$$$activeSuggestedChannel',
                        $$$mainSuggestedRecordsListName: '$$$suggestedChannels',
                        $$$suggestionModelName: 'Thread',
                    });
                    env.invoke(
                        'Composer/_updateSuggestedChannels',
                        composer,
                        mentionKeyword
                    );
                    break;
            }
        } else {
            env.invoke('Composer/closeSuggestions', composer);
        }
    },
    /**
     * Hides the composer, which only makes sense if the composer is
     * currently used as a Discuss Inbox reply composer.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    'Composer/discard'(
        { env },
        composer
    ) {
        if (composer.$$$discussAsReplying(this)) {
            env.invoke('Discuss/clearReplyingToMessage',
                composer.$$$discussAsReplying(this)
            );
        }
    },
    /**
     * Focus this composer and remove focus from all others.
     * Focus is a global concern, it makes no sense to have multiple composers focused at the
     * same time.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    'Composer/focus'(
        { env },
        composer
    ) {
        const allComposers = env.invoke('Composer/all');
        for (const otherComposer of allComposers) {
            if (
                otherComposer !== composer &&
                otherComposer.$$$hasFocus(this)
            ) {
                env.invoke('Record/update', otherComposer, {
                    $$$hasFocus: false,
                });
            }
        }
        env.invoke('Record/update', composer, { $$$hasFocus: true });
    },
    /**
     * Called when current partner is inserting some input in composer.
     * Useful to notify current partner is currently typing something in the
     * composer of this thread to all other members.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    'Composer/handleCurrentPartnerIsTyping'(
        { env },
        composer
    ) {
        if (!composer.$$$thread(this)) {
            return;
        }
        if (
            composer.$$$thread(this).$$$typingMembers(this).includes(
                env.messaging.$$$currentPartner(this)
            )
        ) {
            env.invoke('Rhread/refreshCurrentPartnerIsTyping',
                composer.$$$thread(this)
            );
        } else {
            env.invoke('Rhread/registerCurrentPartnerIsTyping',
                composer.$$$thread(this)
            );
        }
    },
    /**
     * Inserts text content in text input based on selection.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     * @param {string} content
     */
    'Composer/insertIntoTextInput'(
        { env },
        composer,
        content
    ) {
        const partA = composer.$$$textInputContent(this).slice(
            0,
            composer.$$$textInputCursorStart(this)
        );
        const partB = composer.$$$textInputContent(this).slice(
            composer.$$$textInputCursorEnd(this),
            composer.$$$textInputContent(this).length
        );
        env.invoke('Record/update', composer, {
            $$$textInputContent: partA + content + partB,
            $$$textInputCursorStart: composer.$$$textInputCursorStart(this) + content.length,
            $$$textInputCursorEnd: composer.$$$textInputCursorStart(this) + content.length,
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    'Composer/insertSuggestion'(
        { env },
        composer
    ) {
        const cursorPosition = composer.$$$textInputCursorStart(this);
        let textLeft = composer.$$$textInputContent(this).substring(
            0,
            composer.$$$textInputContent(this).substring(0, cursorPosition).lastIndexOf(
                composer.$$$suggestionDelimiter(this)
            ) + 1
        );
        let textRight = composer.$$$textInputContent(this).substring(
            cursorPosition,
            composer.$$$textInputContent(this).length
        );
        if (composer.$$$suggestionDelimiter(this) === ':') {
            textLeft = composer.$$$textInputContent(this).substring(
                0,
                composer.$$$textInputContent(this).substring(0, cursorPosition).lastIndexOf(
                    composer.$$$suggestionDelimiter(this)
                )
            );
            textRight = composer.$$$textInputContent(this).substring(
                cursorPosition,
                composer.$$$textInputContent(this).length
            );
        }
        let recordReplacement = "";
        switch (composer.$$$activeSuggestedRecordName(this)) {
            case '$$$activeSuggestedCannedResponse':
                recordReplacement = composer[
                    composer.$$$activeSuggestedRecordName(this)
                ](this).$$$substitution(this);
                break;
            case '$$$activeSuggestedChannel':
                recordReplacement = composer[
                    composer.$$$activeSuggestedRecordName(this)
                ](this).$$$name(this);
                env.invoke('Record/update', composer, {
                    $$$mentionedChannels: link(
                        composer[composer.$$$activeSuggestedRecordName(this)](this)
                    ),
                });
                break;
            case '$$$activeSuggestedChannelCommand':
                recordReplacement = composer[
                    composer.$$$activeSuggestedRecordName(this)
                ](this).$$$name(this);
                break;
            case '$$$activeSuggestedPartner':
                recordReplacement = composer[
                    composer.$$$activeSuggestedRecordName(this)
                ](this).$$$name(this);
                env.invoke('Record/update', composer, {
                    $$$mentionedPartners: link(
                        composer[composer.$$$activeSuggestedRecordName(this)](this)
                    ),
                });
                break;
        }
        env.invoke('Record/update', composer, {
            $$$textInputContent: textLeft + recordReplacement + ' ' + textRight,
            $$$textInputCursorEnd: textLeft.length + recordReplacement.length + 1,
            $$$textInputCursorStart: textLeft.length + recordReplacement.length + 1,
        });
    },
    /**
     * Open the full composer modal.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    async 'Composer/openFullComposer'(
        { env },
        composer
    ) {
        const attachmentIds = composer.$$$attachments(this).map(
            attachment => attachment.$$$id(this)
        );
        const context = {
            default_attachment_ids: attachmentIds,
            default_body: escapeAndCompactTextContent(composer.$$$textInputContent(this)),
            default_is_log: composer.$$$isLog(this),
            default_model: composer.$$$thread(this).$$$model(this),
            default_partner_ids: composer.$$$recipients(this).map(
                partner => partner.$$$id(this)
            ),
            default_res_id: composer.$$$thread(this).$$$id(this),
            mail_post_autofollow: true,
        };
        const action = {
            type: 'ir.actions.act_window',
            res_model: 'mail.compose.message',
            view_mode: 'form',
            views: [[false, 'form']],
            target: 'new',
            context: context,
        };
        const options = {
            on_close: () => {
                if (!env.invoke('Record/exists', composer.localId)) {
                    return;
                }
                env.invoke('Composer/_reset', composer);
                env.invoke('Thread/loadNewMessages', composer.$$$thread(this));
            },
        };
        await env.bus.trigger('do-action', { action, options });
    },
    /**
     * Post a message in provided composer's thread based on current composer fields values.
     *
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    async 'Composer/postMessage'(
        { env },
        composer
    ) {
        const thread = composer.$$$thread(this);
        env.invoke(
            'Thread/unregisterCurrentPartnerIsTyping',
            composer.$$$thread(this),
            { immediateNotify: true }
        );
        const escapedAndCompactContent = escapeAndCompactTextContent(
            composer.$$$textInputContent(this)
        );
        let body = escapedAndCompactContent.replace(/&nbsp;/g, ' ').trim();
        // This message will be received from the mail composer as html content
        // subtype but the urls will not be linkified. If the mail composer
        // takes the responsibility to linkify the urls we end up with double
        // linkification a bit everywhere. Ideally we want to keep the content
        // as text internally and only make html enrichment at display time but
        // the current design makes this quite hard to do.
        body = env.invoke('Composer/_generateMentionsLinks', composer, body);
        body = parseAndTransform(body, addLink);
        body = env.invoke('Composer/_generateEmojisOnHtml', composer, body);
        let postData = {
            attachment_ids: composer.$$$attachments(this).map(
                attachment => attachment.$$$id(this)
            ),
            body,
            channel_ids: composer.$$$mentionedChannels(this).map(
                channel => channel.$$$id(this)
            ),
            context: {
                mail_post_autofollow: true,
            },
            message_type: 'comment',
            partner_ids: composer.$$$recipients(this).map(
                partner => partner.$$$id(this)
            ),
        };
        if (composer.$$$subjectContent(this)) {
            postData.subject = composer.$$$subjectContent(this);
        }

        try {
            let messageId;
            env.invoke('Record/update', composer, {
                $$$isPostingMessage: true,
            });
            if (thread.model === 'mail.channel') {
                const command = env.invoke(
                    'Composer/_getCommandFromText',
                    composer,
                    body
                );
                Object.assign(postData, {
                    subtype_xmlid: 'mail.mt_comment',
                });
                if (command) {
                    messageId = await env.invoke(
                        'Record/doAsync',
                        composer,
                        () => env.invoke(
                            'Thread/performRpcExecuteCommand',
                            {
                                channelId: thread.$$$id(this),
                                command: command.$$$name(this),
                                postData,
                            }
                        )
                    );
                } else {
                    messageId = await env.invoke(
                        'Record/doAsync',
                        composer,
                        () => env.invoke(
                            'Thread/performRpcMessagePost',
                            {
                                postData,
                                threadId: thread.$$$id(this),
                                threadModel: thread.$$$model(this),
                            }
                        )
                    );
                }
            } else {
                Object.assign(postData, {
                    subtype_xmlid: composer.$$$isLog(this)
                        ? 'mail.mt_note'
                        : 'mail.mt_comment',
                });
                messageId = await env.invoke(
                    'Record/doAsync',
                    composer,
                    () => env.invoke('Thread/performRpcMessagePost', {
                        postData,
                        threadId: thread.$$$id(this),
                        threadModel: thread.$$$model(this),
                    })
                );
                const [messageData] = await env.invoke(
                    'Record/doAsync',
                    composer,
                    () => env.services.rpc({
                        model: 'mail.message',
                        method: 'message_format',
                        args: [[messageId]],
                    }, { shadow: true })
                );
                env.invoke(
                    'Message/insert',
                    {
                        ...env.invoke('Message/convertData', messageData),
                        $$$originThread: insert({
                            $$$id: thread.$$$id(this),
                            $$$model: thread.$$$model(this),
                        }),
                    }
                );
                env.invoke('Thread/loadNewMessages', thread);
            }
            for (const threadView of composer.$$$thread(this).$$$threadViews(this)) {
                // Reset auto scroll to be able to see the newly posted message.
                env.invoke('Record/update', threadView, {
                    $$$hasAutoScrollOnMessageReceived: true,
                });
            }
            env.invoke('Thread/refreshFollowers', thread);
            env.invoke('Thread/fetchAndUpdateSuggestedRecipients', thread);
            env.invoke('Composer/_reset', composer);
        } finally {
            env.invoke('Record/update', composer, {
                $$$isPostingMessage: false,
            });
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    'Composer/setFirstSuggestionActive'(
        { env },
        composer
    ) {
        if (
            !composer[
                composer.$$$mainSuggestedRecordsListName(this)
            ](this)[0]
        ) {
            if (
                !composer[
                    composer.$$$extraSuggestedRecordsListName(this)
                ](this)[0]
            ) {
                return;
            }
            env.invoke('Record/update', composer, {
                [composer.$$$activeSuggestedRecordName(this)]: link(
                    composer[composer.$$$extraSuggestedRecordsListName(this)](this)[0]
                ),
            });
        } else {
            env.invoke('Record/update', composer, {
                [composer.$$$activeSuggestedRecordName(this)]: link(
                    composer[composer.$$$mainSuggestedRecordsListName(this)](this)[0]
                ),
            });
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    'Composer/setLastSuggestionActive'(
        { env },
        composer
    ) {
        if (composer[composer.$$$extraSuggestedRecordsListName(this)](this).length === 0) {
            if (composer[composer.$$$mainSuggestedRecordsListName(this)](this).length === 0) {
                return;
            }
            env.invoke('Record/update', composer, {
                [composer.$$$activeSuggestedRecordName(this)]: link(
                    composer[
                        composer.$$$mainSuggestedRecordsListName(this)
                    ](this)[
                        composer[
                            composer.$$$mainSuggestedRecordsListName(this)
                        ](this).length - 1
                    ]
                ),
            });
        }
        env.invoke('Record/update', composer, {
            [composer.$$$activeSuggestedRecordName(this)]: link(
                composer[
                    composer.$$$extraSuggestedRecordsListName(this)
                ](this)[
                    composer[
                        composer.$$$extraSuggestedRecordsListName(this)
                    ](this).length - 1
                ]
            ),
        });
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    'Composer/setNextSuggestionActive'(
        { env },
        composer
    ) {
        const fullList = composer.$$$extraSuggestedRecordsListName(this) ?
            composer[
                composer.$$$mainSuggestedRecordsListName(this)
            ].concat(composer[composer.$$$extraSuggestedRecordsListName(this)](this)) :
            composer[composer.$$$mainSuggestedRecordsListName(this)];
        if (fullList.length === 0) {
            return;
        }
        const activeElementIndex = fullList.findIndex(
            suggestion => suggestion === composer[composer.$$$activeSuggestedRecordName(this)](this)
        );
        if (activeElementIndex !== fullList.length - 1) {
            env.invoke('Record/update', composer, {
                [composer.$$$activeSuggestedRecordName(this)]: link(
                    fullList[activeElementIndex + 1]
                ),
            });
        } else {
            env.invoke('Record/update', composer, {
                [composer.$$$activeSuggestedRecordName(this)]: link(fullList[0]),
            });
        }
    },
    /**
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    'Composer/setPreviousSuggestionActive'(
        { env },
        composer
    ) {
        const fullList = composer.$$$extraSuggestedRecordsListName(this) ?
            composer[
                composer.$$$mainSuggestedRecordsListName(this)
            ].concat(composer[composer.$$$extraSuggestedRecordsListName(this)](this)) :
            composer[composer.$$$mainSuggestedRecordsListName(this)];
        if (fullList.length === 0) {
            return;
        }
        const activeElementIndex = fullList.findIndex(
            suggestion => suggestion === composer[composer.$$$activeSuggestedRecordName(this)](this)
        );
        if (activeElementIndex === -1) {
            env.invoke('Record/update', composer, {
                [composer.$$$activeSuggestedRecordName(this)]: link(fullList[0])
            });
        } else if (activeElementIndex !== 0) {
            env.invoke('Record/update', composer, {
                [composer.$$$activeSuggestedRecordName(this)]: link(
                    fullList[activeElementIndex - 1]
                ),
            });
        } else {
            env.invoke('Record/update', composer, {
                [composer.$$$activeSuggestedRecordName(this)]: link(
                    fullList[fullList.length - 1]
                ),
            });
        }
    },
    /**
     * @private
     * @param {Object} _
     * @param {Composer} composer
     * @param {string} htmlString
     * @returns {string}
     */
    'Composer/_generateEmojisOnHtml'(
        _,
        composer,
        htmlString
    ) {
        for (const emoji of emojis) {
            for (const source of emoji.sources) {
                const escapedSource = String(source).replace(
                    /([.*+?=^!:${}()|[\]/\\])/g,
                    '\\$1');
                const regexp = new RegExp(
                    '(\\s|^)(' + escapedSource + ')(?=\\s|$)',
                    'g');
                htmlString = htmlString.replace(regexp, '$1' + emoji.unicode);
            }
        }
        return htmlString;
    },
    /**
     *
     * Generates the html link related to the mentioned partner
     *
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     * @param {string} body
     * @returns {string}
     */
    'Composer/_generateMentionsLinks'(
        { env },
        composer,
        body
    ) {
        // List of mention data to insert in the body.
        // Useful to do the final replace after parsing to avoid using the
        // same tag twice if two different mentions have the same name.
        const mentions = [];
        for (const partner of composer.$$$mentionedPartners(this)) {
            const placeholder = `@-mention-partner-${partner.$$$id(this)}`;
            const text = `@${owl.utils.escape(partner.$$$name(this))}`;
            mentions.push({
                class: 'o_mail_redirect',
                id: partner.$$$id(this),
                model: 'res.partner',
                placeholder,
                text,
            });
            body = body.replace(text, placeholder);
        }
        for (const channel of composer.$$$mentionedChannels(this)) {
            const placeholder = `#-mention-channel-${channel.$$$id(this)}`;
            const text = `#${owl.utils.escape(channel.$$$name(this))}`;
            mentions.push({
                class: 'o_channel_redirect',
                id: channel.$$$id(this),
                model: 'mail.channel',
                placeholder,
                text,
            });
            body = body.replace(text, placeholder);
        }
        const baseHREF = env.session.url('/web');
        for (const mention of mentions) {
            const href = `href='${baseHREF}#model=${mention.model}&id=${mention.id}'`;
            const attClass = `class='${mention.class}'`;
            const dataOeId = `data-oe-id='${mention.id}'`;
            const dataOeModel = `data-oe-model='${mention.model}'`;
            const target = `target='_blank'`;
            const link = `<a ${href} ${attClass} ${dataOeId} ${dataOeModel} ${target}>${mention.text}</a>`;
            body = body.replace(mention.placeholder, link);
        }
        return body;
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     * @param {string} content html content
     * @returns {ChannelCommand|undefined} command, if any in the content
     */
    'Composer/_getCommandFromText'(
        { env },
        composer,
        content
    ) {
        if (content.startsWith('/')) {
            const firstWord = content.substring(1).split(/\s/)[0];
            return env.messaging.$$$commands(this).find(command => {
                if (command.$$$name(this) !== firstWord) {
                    return false;
                }
                if (command.$$$channelTypes(this)) {
                    return command.$$$channelTypes(this).includes(
                        composer.$$$thread(this).$$$channelType(this)
                    );
                }
                return true;
            });
        }
        return undefined;
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     */
    'Composer/_reset'({ env }, composer) {
        env.invoke('Composer/closeSuggestions', composer);
        env.invoke('Record/update', composer, {
            $$$attachments: unlinkAll(),
            $$$mentionedChannels: unlinkAll(),
            $$$mentionedPartners: unlinkAll(),
            $$$subjectContent: "",
            $$$textInputContent: '',
            $$$textInputCursorEnd: 0,
            $$$textInputCursorStart: 0,
        });
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     * @param {string} mentionKeyword
     */
    'Composer/_updateSuggestedCannedResponses'(
        { env },
        composer,
        mentionKeyword
    ) {
        env.invoke('Record/update', composer, {
            $$$suggestedCannedResponses: replace(
                env.messaging.$$$cannedResponses(this).filter(
                    cannedResponse => (
                        cannedResponse.$$$source(this) &&
                        cannedResponse.$$$source(this).includes(mentionKeyword)
                    )
                )
            ),
        });
        if (composer.$$$suggestedCannedResponses(this)[0]) {
            env.invoke('Record/update', composer, {
                $$$activeSuggestedCannedResponse: link(
                    composer.$$$suggestedCannedResponses(this)[0]
                ),
                $$$hasToScrollToActiveSuggestion: true,
            });
        } else {
            env.invoke('Record/update', composer, {
                $$$activeSuggestedCannedResponse: unlink(),
            });
        }
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     * @param {string} mentionKeyword
     */
    async 'Composer/_updateSuggestedChannels'(
        { env },
        composer,
        mentionKeyword
    ) {
        const mentions = await env.invoke(
            'Record/doAsync',
            composer,
            () => env.services.rpc(
                {
                    model: 'mail.channel',
                    method: 'get_mention_suggestions',
                    kwargs: {
                        limit: 8,
                        search: mentionKeyword,
                    },
                },
                { shadow: true }
            )
        );
        env.invoke('Record/update', composer, {
            $$$suggestedChannels: insertAndReplace(
                mentions.map(data => {
                    const threadData = env.invoke('Thread/convertData', data);
                    return {
                        $$$model: 'mail.channel',
                        ...threadData,
                    };
                })
            ),
        });

        if (composer.$$$suggestedChannels(this)[0]) {
            env.invoke('Record/update', composer, {
                $$$activeSuggestedChannel: link(
                    composer.$$$suggestedChannels(this)[0]
                ),
                $$$hasToScrollToActiveSuggestion: true,
            });
        } else {
            env.invoke('Record/update', composer, {
                $$$activeSuggestedChannel: unlink(),
            });
        }
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     * @param {string} mentionKeyword
     */
    'Composer/_updateSuggestedChannelCommands'(
        { env },
        composer,
        mentionKeyword
    ) {
        const commands = env.messaging.$$$commands(this).filter(command => {
            if (!command.$$$name(this).includes(mentionKeyword)) {
                return false;
            }
            if (command.$$$channelTypes(this)) {
                return command.$$$channelTypes(this).includes(
                    composer.$$$thread(this).$$$channelType(this)
                );
            }
            return true;
        });
        env.invoke('Record/update', composer, {
            $$$suggestedChannelCommands: replace(commands),
        });
        if (composer.$$$suggestedChannelCommands(this)[0]) {
            env.invoke('Record/update', composer, {
                $$$activeSuggestedChannelCommand: link(
                    composer.$$$suggestedChannelCommands(this)[0]
                ),
                $$$hasToScrollToActiveSuggestion: true,
            });
        } else {
            env.invoke('Record/update', composer, {
                $$$activeSuggestedChannelCommand: unlink(),
            });
        }
    },
    /**
     * @private
     * @param {Object} param0
     * @param {web.env} param0.env
     * @param {Composer} composer
     * @param {string} mentionKeyword
     */
    async 'Composer/_updateSuggestedPartners'(
        { env },
        composer,
        mentionKeyword
    ) {
        const mentions = await env.invoke(
            'Record/doAsync',
            composer,
            () => env.services.rpc(
                {
                    model: 'res.partner',
                    method: 'get_mention_suggestions',
                    kwargs: {
                        limit: 8,
                        search: mentionKeyword,
                    },
                },
                { shadow: true }
            )
        );

        const mainSuggestedPartners = mentions[0];
        const extraSuggestedPartners = mentions[1];
        env.invoke('Record/update', composer, {
            $$$extraSuggestedPartners: insertAndReplace(
                extraSuggestedPartners.map(data =>
                    env.invoke('Partner/convertData', data)
                )
            ),
            $$$mainSuggestedPartners: insertAndReplace(
                mainSuggestedPartners.map(data =>
                    env.invoke('Partner/convertData', data)
                )
            ),
        });

        if (composer.$$$mainSuggestedPartners(this)[0]) {
            env.invoke('Record/update', composer, {
                $$$activeSuggestedPartner: link(
                    composer.$$$mainSuggestedPartners(this)[0]
                ),
                $$$hasToScrollToActiveSuggestion: true,
            });
        } else if (composer.$$$extraSuggestedPartners(this)[0]) {
            env.invoke('Record/update', composer, {
                $$$activeSuggestedPartner: link(
                    composer.$$$extraSuggestedPartners(this)[0]
                ),
                $$$hasToScrollToActiveSuggestion: true,
            });
        } else {
            env.invoke('Record/update', composer, {
                $$$activeSuggestedPartner: unlink(),
            });
        }
    },
    /**
     * Validates user's current typing as a correct mention keyword in order
     * to trigger mentions suggestions display.
     * Returns the mention keyword without the suggestion delimiter if it
     * has been validated and false if not.
     *
     * @private
     * @param {Object} _
     * @param {Composer} composer
     * @param {boolean} beginningOnly
     * @returns {string|boolean}
     */
    'Composer/_validateMentionKeyword'(
        _,
        composer,
        beginningOnly
    ) {
        const leftString = composer.$$$textInputContent(this).substring(
            0,
            composer.$$$textInputCursorStart(this)
        );
        // use position before suggestion delimiter because there should be whitespaces
        // or line feed/carriage return before the suggestion delimiter
        const beforeSuggestionDelimiterPosition = leftString.lastIndexOf(
            composer.$$$suggestionDelimiter(this)
        ) - 1;
        if (beginningOnly && beforeSuggestionDelimiterPosition > 0) {
            return false;
        }
        let searchStr = composer.$$$textInputContent(this).substring(
            beforeSuggestionDelimiterPosition,
            composer.$$$textInputCursorStart(this)
        );
        // regex string start with suggestion delimiter or whitespace then suggestion delimiter
        const pattern = (
            "^" +
            composer.$$$suggestionDelimiter(this) +
            "|^\\s" +
            composer.$$$suggestionDelimiter(this)
        );
        const regexStart = new RegExp(pattern, 'g');
        // trim any left whitespaces or the left line feed/ carriage return
        // at the beginning of the string
        searchStr = searchStr.replace(/^\s\s*|^[\n\r]/g, '');
        if (regexStart.test(searchStr) && searchStr.length) {
            searchStr = searchStr.replace(pattern, '');
            return !searchStr.includes(' ') && !/[\r\n]/.test(searchStr)
                ? searchStr.replace(composer.$$$suggestionDelimiter(this), '')
                : false;
        }
        return false;
    },
});

const model = defineModel({
    name: 'Composer',
    fields: {
        $$$activeSuggestedCannedResponse: many2one('CannedResponse'),
        $$$activeSuggestedChannel: many2one('Thread'),
        $$$activeSuggestedChannelCommand: many2one('ChannelCommand'),
        $$$activeSuggestedPartner: many2one('Partner'),
        $$$activeSuggestedRecord: attr({
            /**
             * @param {Object} param0
             * @param {Composer} param0.record
             * @returns {Record|undefined}
             */
            compute({ record }) {
                if (!record[record.$$$activeSuggestedRecordName(this)]) {
                    return;
                }
                return record[record.$$$activeSuggestedRecordName(this)](this);
            },
        }),
        $$$activeSuggestedRecordName: attr(),
        $$$attachments: many2many('Attachment', {
            inverse: '$$$composers',
        }),
        /**
         * This field watches the uploading (= temporary) status of attachments
         * linked to this composer.
         *
         * Useful to determine whether there are some attachments that are being
         * uploaded.
         */
        $$$attachmentsAreTemporary: attr({
            related: '$$$attachments.$$$isTemporary',
        }),
        $$$canPostMessage: attr({
            /**
             * @param {Object} param0
             * @param {Composer} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                if (
                    !record.$$$textInputContent(this) &&
                    record.$$$attachments(this).length === 0
                ) {
                    return false;
                }
                return (
                    !record.$$$hasUploadingAttachment(this) &&
                    !record.$$$isPostingMessage(this)
                );
            },
            default: false,
        }),
        /**
         * Instance of discuss if this composer is used as the reply composer
         * from Inbox. This field is computed from the inverse relation and
         * should be considered read-only.
         */
        $$$discussAsReplying: one2one('Discuss', {
            inverse: '$$$replyingToMessageOriginThreadComposer',
        }),
        $$$extraSuggestedPartners: many2many('Partner', {
            /**
             * Ensure extraSuggestedPartners does not contain any partner already
             * present in mainSuggestedPartners. This is necessary for the
             * consistency of suggestion list.
             *
             * @param {Object} param0
             * @param {Composer} param0.record
             * @returns {Partner[]}
             */
            compute({ record }) {
                return unlink(record.$$$mainSuggestedPartners(this));
            },
        }),
        $$$extraSuggestedRecordsList: attr({
            /**
             * @param {Object} param0
             * @param {Composer} param0.record
             * @returns {Record[]}
             */
            compute({ record }) {
                return record.$$$extraSuggestedRecordsListName(this)
                    ? record[record.$$$extraSuggestedRecordsListName(this)](this)
                    : [];
            },
        }),
        /**
         * Allows to have different model types of mentions through a dynamic process
         * RPC can provide 2 lists and the second is defined as "extra"
         */
        $$$extraSuggestedRecordsListName: attr({
            default: '',
        }),
        /**
         * This field determines whether some attachments linked to this
         * composer are being uploaded.
         */
        $$$hasUploadingAttachment: attr({
            /**
             * @param {Object} param0
             * @param {Composer} param0.record
             * @returns {boolean}
             */
            compute({ record }) {
                return record.$$$attachments(this).some(
                    attachment => attachment.$$$isTemporary(this)
                );
            },
        }),
        $$$hasFocus: attr({
            default: false,
        }),
        $$$hasSuggestions: attr({
            /**
             * @param {Object} param0
             * @param {Composer} param0.record
             * @return {boolean}
             */
            compute({ record }) {
                const hasMainSuggestedRecordsList = record.$$$mainSuggestedRecordsListName(this)
                    ? record[
                        record.$$$mainSuggestedRecordsListName(this)
                    ](this).length > 0
                    : false;
                const hasExtraSuggestedRecordsList = record.$$$extraSuggestedRecordsListName(this)
                    ? record[
                        record.$$$extraSuggestedRecordsListName(this)
                    ](this).length > 0
                    : false;
                return hasMainSuggestedRecordsList || hasExtraSuggestedRecordsList;
            },
            default: false,
        }),
        /**
         * Determines whether the currently active suggestion should be scrolled
         * into view.
         */
        $$$hasToScrollToActiveSuggestion: attr({
            default: true,
        }),
        /**
         * If true composer will log a note, else a comment will be posted.
         */
        $$$isLog: attr({
            default: false,
        }),
        /**
         * Determines whether a post_message request is currently pending.
         */
        $$$isPostingMessage: attr({
            default: false,
        }),
        $$$mainSuggestedRecordsList: attr({
            /**
             * @param {Object} param0
             * @param {Composer} param0.record
             * @returns {Record[]}
             */
            compute({ record }) {
                return record.$$$mainSuggestedRecordsListName(this)
                    ? record[record.$$$mainSuggestedRecordsListName(this)](this)
                    : [];
            },
        }),
        /**
         * Allows to have different model types of mentions through a dynamic process
         * RPC can provide 2 lists and the first is defined as "main"
         */
        $$$mainSuggestedRecordsListName: attr({
            default: "",
        }),
        $$$mainSuggestedPartners: many2many('Partner'),
        $$$mentionedChannels: many2many('Thread', {
            /**
             * Detects if mentioned channels are still in the composer text input content
             * and removes them if not.
             *
             * @param {Object} param0
             * @param {Composer} param0.record
             * @returns {Partner[]}
             */
            compute({ record }) {
                const unmentionedChannels = [];
                // ensure the same mention is not used multiple times if multiple
                // channels have the same name
                const namesIndex = {};
                for (const channel of record.$$$mentionedChannels(this)) {
                    const fromIndex = namesIndex[channel.$$$name(this)] !== undefined
                        ? namesIndex[channel.$$$name(this)] + 1
                        : 0;
                    const index = record.$$$textInputContent(this).indexOf(
                        `#${channel.$$$name(this)}`,
                        fromIndex
                    );
                    if (index !== -1) {
                        namesIndex[channel.$$$name(this)] = index;
                    } else {
                        unmentionedChannels.push(channel);
                    }
                }
                return unlink(unmentionedChannels);
            },
        }),
        $$$mentionedPartners: many2many('Partner', {
            /**
             * Detects if mentioned partners are still in the composer text input content
             * and removes them if not.
             *
             * @param {Object} param0
             * @param {Composer} param0.record
             * @returns {Partner[]}
             */
            compute({ record }) {
                const unmentionedPartners = [];
                // ensure the same mention is not used multiple times if multiple
                // partners have the same name
                const namesIndex = {};
                for (const partner of record.$$$mentionedPartners(this)) {
                    const fromIndex = namesIndex[partner.$$$name(this)] !== undefined
                        ? namesIndex[partner.$$$name(this)] + 1
                        : 0;
                    const index = record.$$$textInputContent(this).indexOf(
                        `@${partner.$$$name(this)}`,
                        fromIndex
                    );
                    if (index !== -1) {
                        namesIndex[partner.$$$name(this)] = index;
                    } else {
                        unmentionedPartners.push(partner);
                    }
                }
                return unlink(unmentionedPartners);
            },
        }),
        /**
         * Determines the extra `Partner` (on top of existing followers)
         * that will receive the message being composed by `this`, and that will
         * also be added as follower of `this.thread`.
         */
        $$$recipients: many2many('Partner', {
            /**
             * @param {Object} param0
             * @param {Composer} param0.record
             * @returns {Partner[]}
             */
            compute({ record }) {
                if (
                    record.$$$thread(this) &&
                    record.$$$thread(this).$$$$model(this) === 'mail.channel'
                ) {
                    // prevent from notifying/adding to followers non-members
                    return unlinkAll();
                }
                const recipients = [...record.$$$mentionedPartners(this)];
                if (record.$$$thread(this) && !record.$$$isLog(this)) {
                    for (const recipient of record.$$$thread(this).$$$suggestedRecipientInfoList(this)) {
                        if (recipient.$$$partner(this) && recipient.$$$isSelected(this)) {
                            recipients.push(recipient.$$$partner(this));
                        }
                    }
                }
                return replace(recipients);
            },
        }),
        /**
         * Composer subject input content.
         */
        $$$subjectContent: attr({
            default: "",
        }),
        $$$suggestedCannedResponses: many2many('CannedResponse'),
        $$$suggestedChannelCommands: many2many('ChannelCommand'),
        $$$suggestedChannels: many2many('Thread'),
        /**
         * Special character used to trigger different kinds of suggestions
         * such as canned responses (:), channels (#), commands (/) and partners (@)
         */
        $$$suggestionDelimiter: attr({
            default: "",
        }),
        $$$suggestionModelName: attr({
            default: "",
        }),
        $$$textInputContent: attr({
            default: "",
        }),
        $$$textInputCursorEnd: attr({
            default: 0,
        }),
        $$$textInputCursorStart: attr({
            default: 0,
        }),
        $$$textInputSelectionDirection: attr({
            default: 'none',
        }),
        $$$thread: one2one('Thread', {
            inverse: '$$$composer',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$threadSuggestedRecipientInfoList: many2many('SuggestedRecipientInfo', {
            related: '$$$thread.$$$suggestedRecipientInfoList',
        }),
        /**
         * Serves as compute dependency.
         */
        $$$threadSuggestedRecipientInfoListIsSelected: attr({
            related: '$$$threadSuggestedRecipientInfoList.$$$isSelected',
        }),
    },
});

return defineFeatureSlice(
    'mail/static/src/models/composer/composer.js',
    actions,
    model,
);

});
