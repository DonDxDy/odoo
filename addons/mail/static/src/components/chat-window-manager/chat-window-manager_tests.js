odoo.define('mail/static/src/components/chat-window-manager/chat-window-manager_tests.js', function (require) {
'use strict';

const { makeDeferred } = require('mail/static/src/utils/deferred/deferred.js');
const {
    afterEach,
    afterNextRender,
    beforeEach,
    nextAnimationFrame,
    start,
} = require('mail/static/src/utils/test-utils.js');

const Bus = require('web.Bus');
const {
    file: { createFile, inputFiles },
    dom: { triggerEvent },
    makeTestPromise,
} = require('web.test_utils');

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('chat-window-manager', {}, function () {
QUnit.module('chat-window-manager_tests.js', {
    beforeEach() {
        beforeEach(this);

        this.start = async params => {
            const env = await start({
                hasChatWindow: true,
                hasMessagingMenu: true,
                ...params,
                data: this.data,
            });
            this.env = env;
            return env;
        };

        /**
         * Simulates the external behaviours & DOM changes implied by hiding home menu.
         * Needed to assert validity of tests at technical level (actual code of home menu could not
         * be used in these tests).
         *
         * @param {web.env} env
         */
        this.hideHomeMenu = async env => {
            await env.bus.trigger('will_hide_home_menu');
            await env.bus.trigger('hide_home_menu');
        };

        /**
         * Simulates the external behaviours & DOM changes implied by showing home menu.
         * Needed to assert validity of tests at technical level (actual code of home menu could not
         * be used in these tests).
         *
         * @param {web.env} env
         */
        this.showHomeMenu = async env => {
            await env.bus.trigger('will_show_home_menu');
            const $frag = document.createDocumentFragment();
            // in real condition, chat window will be removed and put in a fragment then
            // reinserted into DOM
            const selector = this.debug ? 'body' : '#qunit-fixture';
            $(selector).contents().appendTo($frag);
            await env.bus.trigger('show_home_menu');
            $(selector).append($frag);
        };
    },
    afterEach() {
        afterEach(this);
    },
});

QUnit.skip('[technical] messaging not created', async function (assert) {
    /**
     * Creation of messaging in env is async due to generation of models being
     * async. Generation of models is async because it requires parsing of all
     * JS modules that contain pieces of model definitions.
     *
     * Time of having no messaging is very short, almost imperceptible by user
     * on UI, but the display should not crash during this critical time period.
     */
    assert.expect(2);

    const def = makeDeferred();
    await this.start({
        async beforeGenerateModels() {
            await def;
        },
        waitUntilMessagingCondition: 'none',
    });
    assert.containsOnce(
        document.body,
        '.o-ChatWindowManager',
        "should have chat window manager even when messaging is not yet created"
    );

    // simulate messaging being created
    def.resolve();
    await nextAnimationFrame();

    assert.containsOnce(
        document.body,
        '.o-ChatWindowManager',
        "should still contain chat window manager after messaging has been created"
    );
});

QUnit.test('initial mount', async function (assert) {
    assert.expect(1);

    await this.start();
    assert.containsOnce(
        document.body,
        '.o-ChatWindowManager',
        "should have chat window manager"
    );
});

QUnit.test('chat window new message: basic rendering', async function (assert) {
    assert.expect(10);

    await this.start();
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-newMessageButton').click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "should have open a chat window"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow_header',
        "should have a header"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindowHeader-name',
        "should have name part in header"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindowHeader-name').textContent,
        "New message",
        "should display 'new message' in the header"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindowHeader-command',
        "should have 1 command in header"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindowHeader-commandClose',
        "should have command to close chat window"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow-newMessageForm',
        "should have a new message chat window container"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow-newMessageFormLabel',
        "should have a part in selection with label"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindow-newMessageFormLabel').textContent.trim(),
        "To:",
        "should have label 'To:' in selection"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow-newMessageFormInput',
        "should have an input in selection"
    );
});

QUnit.test('chat window new message: focused on open', async function (assert) {
    assert.expect(2);

    await this.start();
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-newMessageButton').click()
    );
    assert.hasClass(
        document.querySelector('.o-ChatWindow'),
        'o-isFocused',
        "chat window should be focused"
    );
    assert.ok(
        document.activeElement,
        document.querySelector('.o-ChatWindow-newMessageFormInput'),
        "chat window focused = selection input focused"
    );
});

QUnit.test('chat window new message: close', async function (assert) {
    assert.expect(1);

    await this.start();
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-newMessageButton').click()
    );
    await afterNextRender(() =>
        document.querySelector('.o-ChatWindowHeader-commandClose').click()
    );
    assert.containsNone(
        document.body,
        '.o-ChatWindow',
        "chat window should be closed"
    );
});

QUnit.test('chat window new message: fold', async function (assert) {
    assert.expect(6);

    await this.start();
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-newMessageButton').click()
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-ChatWindow'),
        'o-isFolded',
        "chat window should not be folded by default"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow-newMessageForm',
        "chat window should have new message form"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatWindow-header').click()
    );
    assert.hasClass(
        document.querySelector('.o-ChatWindow'),
        'o-isFolded',
        "chat window should become folded"
    );
    assert.containsNone(
        document.body,
        '.o-ChatWindow-newMessageForm',
        "chat window should not have new message form"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatWindow-header').click()
    );
    assert.doesNotHaveClass(
        document.querySelector('.o-ChatWindow'),
        'o-isFolded',
        "chat window should become unfolded"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow-newMessageForm',
        "chat window should have new message form"
    );
});

QUnit.test('open chat from "new message" chat window should open chat in place of this "new message" chat window', async function (assert) {
    /**
     * InnerWith computation uses following info:
     * ([mocked] global window width: @see `mail/static/src/utils/test-utils.js:start()` method)
     * (others: @see ChatWindowManager:visual)
     *
     * - chat window width: 325px
     * - start/end/between gap width: 10px/10px/5px
     * - hidden menu width: 200px
     * - global width: 1920px
     *
     * Enough space for 3 visible chat windows:
     *  10 + 325 + 5 + 325 + 5 + 325 + 10 = 1000 < 1920
     */
    assert.expect(11);

    this.data['mail.channel'].records.push(
        { is_minimized: true },
        { is_minimized: true },
    );
    this.data['res.partner'].records.push(
        {
            id: 131,
            name: "Partner 131"
        }
    );
    this.data['res.users'].records.push(
        { partner_id: 131 }
    );
    const imSearchDef = makeDeferred();
    await this.start({
        env: {
            browser: {
                innerWidth: 1920,
            },
        },
        async mockRPC(route, args) {
            const res = await this._super(...arguments);
            if (args.method === 'im_search') {
                imSearchDef.resolve();
            }
            return res;
        }
    });
    assert.containsN(
        document.body,
        '.o-ChatWindow',
        2,
        "should have 2 chat windows initially"
    );
    assert.containsNone(
        document.body,
        '.o-ChatWindow.o-hasNewMessage',
        "should not have any 'new message' chat window initially"
    );

    // open "new message" chat window
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-newMessageButton').click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow.o-hasNewMessage',
        "should have 'new message' chat window after clicking 'new message' in messaging menu"
    );
    assert.containsN(
        document.body,
        '.o-ChatWindow',
        3,
        "should have 3 chat window after opening 'new message' chat window",
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow-newMessageFormInput',
        "'new message' chat window should have new message form input"
    );
    assert.hasClass(
        document.querySelector('.o-ChatWindow[data-visible-index="2"]'),
        'o-hasNewMessage',
        "'new message' chat window should be the last chat window initially",
    );

    await afterNextRender(() =>
        document.querySelector(`
            .o-ChatWindow[data-visible-index="2"]
            .o-ChatWindowHeader-commandShiftNext
        `).click()
    );
    assert.hasClass(
        document.querySelector('.o-ChatWindow[data-visible-index="1"]'),
        'o-hasNewMessage',
        "'new message' chat window should have moved to the middle after clicking shift previous",
    );

    // search for a user in "new message" autocomplete
    document.execCommand('insertText', false, "131");
    document.querySelector('.o-ChatWindow-newMessageFormInput')
        .dispatchEvent(new window.KeyboardEvent('keydown'));
    document.querySelector('.o-ChatWindow-newMessageFormInput')
        .dispatchEvent(new window.KeyboardEvent('keyup'));
    // Wait for search RPC to be resolved. The following await lines are
    // necessary because autocomplete is an external lib therefore it is not
    // possible to use `afterNextRender`.
    await imSearchDef;
    await nextAnimationFrame();
    const link = document.querySelector(`
        .ui-autocomplete
        .ui-menu-item
        a
    `);
    assert.ok(
        link,
        "should have autocomplete suggestion after typing on 'new message' input"
    );
    assert.strictEqual(
        link.textContent,
        "Partner 131",
        "autocomplete suggestion should target the partner matching search term"
    );

    await afterNextRender(() => link.click());
    assert.containsNone(
        document.body,
        '.o-ChatWindow.o-hasNewMessage',
        "should have removed the 'new message' chat window after selecting a partner"
    );
    assert.strictEqual(
        document.querySelector(`
            .o-ChatWindow[data-visible-index="1"]
            .o-ChatWindowHeader-name
        `).textContent,
        "Partner 131",
        "chat window with selected partner should be opened in position where 'new message' chat window was, which is in the middle"
    );
});

QUnit.test('new message autocomplete should automatically select first result', async function (assert) {
    assert.expect(1);

    this.data['res.partner'].records.push(
        {
            id: 131,
            name: "Partner 131",
        }
    );
    this.data['res.users'].records.push(
        { partner_id: 131 }
    );
    const imSearchDef = makeDeferred();
    await this.start({
        async mockRPC(route, args) {
            const res = await this._super(...arguments);
            if (args.method === 'im_search') {
                imSearchDef.resolve();
            }
            return res;
        },
    });

    // open "new message" chat window
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-newMessageButton').click()
    );

    // search for a user in "new message" autocomplete
    document.execCommand('insertText', false, "131");
    document.querySelector('.o-ChatWindow-newMessageFormInput')
        .dispatchEvent(new window.KeyboardEvent('keydown'));
    document.querySelector('.o-ChatWindow-newMessageFormInput')
        .dispatchEvent(new window.KeyboardEvent('keyup'));
    // Wait for search RPC to be resolved. The following await lines are
    // necessary because autocomplete is an external lib therefore it is not
    // possible to use `afterNextRender`.
    await imSearchDef;
    await nextAnimationFrame();
    assert.hasClass(
        document.querySelector(`
            .ui-autocomplete
            .ui-menu-item
            a
        `),
        'ui-state-active',
        "first autocomplete result should be automatically selected",
    );
});

QUnit.test('chat window: basic rendering', async function (assert) {
    assert.expect(11);

    // channel that is expected to be found in the messaging menu
    // with random unique id and name that will be asserted during the test
    this.data['mail.channel'].records.push(
        {
            id: 20,
            name: "General",
        }
    );
    const env = await this.start();
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector('.o-NotificationList-preview').click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "should have open a chat window"
    );
    const chatWindow = document.querySelector('.o-ChatWindow');
    assert.strictEqual(
        chatWindow.dataset.threadLocalId,
        env.invoke('Thread/findFromId', {
            $$$id: 20,
            $$$model: 'mail.channel',
        }).localId,
        "should have open a chat window of channel"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow-header',
        "should have header part"
    );
    assert.containsOnce(
        document.body,
        '.o-ThreadIcon',
        "should have thread icon in header part"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindowHeader-name',
        "should have thread name in header part"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindowHeader-name').textContent,
        "General",
        "should have correct thread name in header part"
    );
    assert.containsN(
        document.body,
        '.o-ChatWindowHeader-command',
        2,
        "should have 2 commands in header part"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindowHeader-commandExpand',
        "should have command to expand thread in discuss"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindowHeader-commandClose',
        "should have command to close chat window"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow-thread',
        "should have part to display thread content inside chat window"
    );
    assert.hasClass(
        document.querySelector('.o-ChatWindow-thread'),
        'o-ThreadView',
        "thread part should use component ThreadView"
    );
});

QUnit.test('chat window: fold', async function (assert) {
    assert.expect(9);

    // channel that is expected to be found in the messaging menu
    // with random UUID, will be asserted during the test
    this.data['mail.channel'].records.push(
        { uuid: 'channel-uuid' }
    );
    await this.start({
        mockRPC(route, args) {
            if (args.method === 'channel_fold') {
                assert.step(`rpc:${args.method}/${args.kwargs.state}`);
            }
            return this._super(...arguments);
        },
    });
    // Open Thread
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview
        `).click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow-thread',
        "chat window should have a thread"
    );
    assert.verifySteps(
        ['rpc:channel_fold/open'],
        "should sync fold state 'open' with server after opening chat window"
    );

    // Fold chat window
    await afterNextRender(() =>
        document.querySelector('.o-ChatWindow-header').click()
    );
    assert.verifySteps(
        ['rpc:channel_fold/folded'],
        "should sync fold state 'folded' with server after folding chat window"
    );
    assert.containsNone(
        document.body,
        '.o-ChatWindow-thread',
        "chat window should not have any thread"
    );

    // Unfold chat window
    await afterNextRender(() =>
        document.querySelector('.o-ChatWindow-header').click()
    );
    assert.verifySteps(
        ['rpc:channel_fold/open'],
        "should sync fold state 'open' with server after unfolding chat window"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow-thread',
        "chat window should have a thread"
    );
});

QUnit.test('chat window: open / close', async function (assert) {
    assert.expect(10);

    // channel that is expected to be found in the messaging menu
    // with random UUID, will be asserted during the test
    this.data['mail.channel'].records.push(
        { uuid: 'channel-uuid' }
    );
    await this.start({
        mockRPC(route, args) {
            if (args.method === 'channel_fold') {
                assert.step(`rpc:channel_fold/${args.kwargs.state}`);
            }
            return this._super(...arguments);
        },
    });
    assert.containsNone(
        document.body,
        '.o-ChatWindow',
        "should not have a chat window initially"
    );
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview
        `).click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "should have a chat window after clicking on thread preview"
    );
    assert.verifySteps(
        ['rpc:channel_fold/open'],
        "should sync fold state 'open' with server after opening chat window"
    );

    // Close chat window
    await afterNextRender(() =>
        document.querySelector('.o-ChatWindowHeader-commandClose').click()
    );
    assert.containsNone(
        document.body,
        '.o-ChatWindow',
        "should not have a chat window after closing it"
    );
    assert.verifySteps(
        ['rpc:channel_fold/closed'],
        "should sync fold state 'closed' with server after closing chat window"
    );

    // Reopen chat window
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview
        `).click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "should have a chat window again after clicking on thread preview again"
    );
    assert.verifySteps(
        ['rpc:channel_fold/open'],
        "should sync fold state 'open' with server after opening chat window again"
    );
});

QUnit.test('chat window: close on ESCAPE', async function (assert) {
    assert.expect(10);

    // a chat window with thread is expected to be initially open for this test
    this.data['mail.channel'].records.push(
        { is_minimized: true }
    );
    // expected partner to be found by mention during the test
    this.data['res.partner'].records.push(
        { name: "TestPartner" }
    );
    await this.start({
        mockRPC(route, args) {
            if (args.method === 'channel_fold') {
                assert.step(`rpc:channel_fold/${args.kwargs.state}`);
            }
            return this._super(...arguments);
        },
    });
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "chat window should be opened initially"
    );

    await afterNextRender(() =>
        document.querySelector('.o-Composer-buttonEmojis').click()
    );
    assert.containsOnce(
        document.body,
        '.o-EmojisPopover',
        "emojis popover should be opened after click on emojis button"
    );

    await afterNextRender(() => {
        const ev = new window.KeyboardEvent('keydown', { bubbles: true, key: "Escape" });
        document.querySelector('.o-Composer-buttonEmojis').dispatchEvent(ev);
    });
    assert.containsNone(
        document.body,
        '.o-EmojisPopover',
        "emojis popover should be closed after pressing escape on emojis button"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "chat window should still be opened after pressing escape on emojis button"
    );

    await afterNextRender(() => {
        document.querySelector('.o-ComposerTextInput-textarea').focus();
        document.execCommand('insertText', false, "@");
        document.querySelector('.o-ComposerTextInput-textarea')
            .dispatchEvent(new window.KeyboardEvent('keydown'));
        document.querySelector('.o-ComposerTextInput-textarea')
            .dispatchEvent(new window.KeyboardEvent('keyup'));
    });
    assert.hasClass(
        document.querySelector('.o-ComposerSuggestionList-list'),
        'show',
        "should display mention suggestions on typing '@'"
    );

    await afterNextRender(() => {
        const ev = new window.KeyboardEvent('keydown', { bubbles: true, key: 'Escape' });
        document.querySelector('.o-ComposerTextInput-textarea').dispatchEvent(ev);
    });
    assert.containsNone(
        document.body,
        '.o-ComposerSuggestionList-list',
        "mention suggestion should be closed after pressing escape on mention suggestion"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "chat window should still be opened after pressing escape on mention suggestion"
    );

    await afterNextRender(() => {
        const ev = new window.KeyboardEvent('keydown', { bubbles: true, key: 'Escape' });
        document.querySelector('.o-ComposerTextInput-textarea').dispatchEvent(ev);
    });
    assert.containsNone(
        document.body,
        '.o-ChatWindow',
        "chat window should be closed after pressing escape if there was no other priority escape handler"
    );
    assert.verifySteps(['rpc:channel_fold/closed']);
});

QUnit.test('focus next visible chat window when closing current chat window with ESCAPE', async function (assert) {
    /**
     * computation uses following info:
     * ([mocked] global window width: @see `mail/static/src/utils/test-utils.js:start()` method)
     * (others: @see ChatWindowManager:visual)
     *
     * - chat window width: 325px
     * - start/end/between gap width: 10px/10px/5px
     * - hidden menu width: 200px
     * - global width: 1920px
     *
     * Enough space for 2 visible chat windows:
     *  10 + 325 + 5 + 325 + 10 = 670 < 1920
     */
    assert.expect(4);

    // 2 chat windows with thread are expected to be initially open for this test
    this.data['mail.channel'].records.push(
        {
            is_minimized: true,
            state: 'open',
        },
        {
            is_minimized: true,
            state: 'open',
        }
    );
    await this.start({
        env: {
            browser: {
                innerWidth: 1920,
            },
        },
    });
    assert.containsN(
        document.body,
        '.o-ChatWindow',
        2,
        "2 chat windows should be present initially"
    );
    assert.containsNone(
        document.body,
        '.o-ChatWindow.o-isFolded',
        "both chat windows should be open"
    );

    await afterNextRender(() => {
        const ev = new window.KeyboardEvent('keydown', { bubbles: true, key: 'Escape' });
        document.querySelector('.o-ComposerTextInput-textarea').dispatchEvent(ev);
    });
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "only one chat window should remain after pressing escape on first chat window"
    );
    assert.hasClass(
        document.querySelector('.o-ChatWindow'),
        'o-isFocused',
        "next visible chat window should be focused after pressing escape on first chat window"
    );
});

QUnit.test('[technical] chat window: composer state conservation on toggle home menu', async function (assert) {
    // technical as show/hide home menu simulation are involved and home menu implementation
    // have side-effects on DOM that may make chat window components not work
    assert.expect(7);

    // channel that is expected to be found in the messaging menu
    // with random unique id that is needed to link messages
    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    await this.start();
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler'
    ).click());
    await afterNextRender(() =>
        document.querySelector(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview
        `).click()
    );
    // Set content of the composer of the chat window
    await afterNextRender(() => {
        document.querySelector('.o-ComposerTextInput-textarea').focus();
        document.execCommand('insertText', false, 'XDU for the win !');
    });
    assert.containsNone(
        document.body,
        `
            .o-Composer
            .o-Attachment
        `,
        "composer should have no attachment initially"
    );
    // Set attachments of the composer
    const files = [
        await createFile({
            name: 'text state conservation on toggle home menu.txt',
            content: "hello, world",
            contentType: 'text/plain',
        }),
        await createFile({
            name: 'text2 state conservation on toggle home menu.txt',
            content: "hello, xdu is da best man",
            contentType: 'text/plain',
        })
    ];
    await afterNextRender(() =>
        inputFiles(
            document.querySelector('.o-FileUploader-input'),
            files
        )
    );
    assert.strictEqual(
        document.querySelector('.o-ComposerTextInput-textarea').value,
        "XDU for the win !",
        "chat window composer initial text input should contain 'XDU for the win !'"
    );
    assert.containsN(
        document.body,
        `
            .o-Composer
            .o-Attachment
        `,
        2,
        "composer should have 2 total attachments after adding 2 attachments"
    );

    await this.hideHomeMenu();
    assert.strictEqual(
        document.querySelector('.o-ComposerTextInput-textarea').value,
        "XDU for the win !",
        "Chat window composer should still have the same input after hiding home menu"
    );
    assert.containsN(
        document.body,
        `
            .o-Composer
            .o-Attachment
        `,
        2,
        "chat window composer should have 2 attachments after hiding home menu"
    );

    // Show home menu
    await this.showHomeMenu();
    assert.strictEqual(
        document.querySelector('.o-ComposerTextInput-textarea').value,
        "XDU for the win !",
        "chat window composer should still have the same input showing home menu"
    );
    assert.containsN(
        document.body,
        `
            .o-Composer
            .o-Attachment
        `,
        2,
        "chat window composer should have 2 attachments showing home menu"
    );
});

QUnit.test('[technical] chat window: scroll conservation on toggle home menu', async function (assert) {
    // technical as show/hide home menu simulation are involved and home menu implementation
    // have side-effects on DOM that may make chat window components not work
    assert.expect(2);

    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    for (let i = 0; i < 10; i++) {
        this.data['mail.message'].records.push(
            {
                body: "not empty",
                channel_ids: [20],
            }
        );
    }
    await this.start();
    await afterNextRender(() => document.querySelector('.o-MessagingMenu-toggler').click());
    await this.afterEvent({
        eventName: 'o-component-message-list-scrolled',
        func: () => document.querySelector('.o-NotificationList-preview').click(),
        message: "should wait until channel 20 scrolled to its last message after opening it from the messaging menu",
        predicate: ({ scrollTop, threadViewer }) => {
            const messageList = document.querySelector('.o-ThreadView-messageList');
            return (
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20 &&
                scrollTop === messageList.scrollHeight - messageList.clientHeight
            );
        },
    });
    // Set a scroll position to chat window
    await this.afterEvent({
        eventName: 'o-component-message-list-scrolled',
        func: () => {
            document.querySelector('.o-ThreadView-messageList').scrollTop = 142;
        },
        message: "should wait until channel 20 scrolled to 142 after setting this value manually",
        predicate: ({ scrollTop, threadViewer }) => {
            return (
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20 &&
                scrollTop === 142
            );
        },
    });
    await afterNextRender(() => this.hideHomeMenu());
    await this.afterEvent({
        eventName: 'o-component-message-list-scrolled',
        func: () => this.showHomeMenu(),
        message: "should wait until channel 20 restored its scroll to 142 after hiding the home menu",
        predicate: ({ scrollTop, threadViewer }) => {
            return (
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20 &&
                scrollTop === 142
            );
        },
    });
    assert.strictEqual(
        document.querySelector('.o-ThreadView-messageList').scrollTop,
        142,
        "chat window scrollTop should still be the same after home menu is shown"
    );
});

QUnit.test('open 2 different chat windows: enough screen width [REQUIRE FOCUS]', async function (assert) {
    /**
     * computation uses following info:
     * ([mocked] global window width: @see `mail/static/src/utils/test-utils.js:start()` method)
     * (others: @see ChatWindowManager:visual)
     *
     * - chat window width: 325px
     * - start/end/between gap width: 10px/10px/5px
     * - hidden menu width: 200px
     * - global width: 1920px
     *
     * Enough space for 2 visible chat windows:
     *  10 + 325 + 5 + 325 + 10 = 670 < 1920
     */
    assert.expect(8);

    // 2 channels are expected to be found in the messaging menu, each with a
    // random unique id that will be referenced in the test
    this.data['mail.channel'].records.push(
        { id: 10 },
        { id: 20 }
    );
    const env = await this.start({
        env: {
            browser: {
                innerWidth: 1920, // enough to fit at least 2 chat windows
            },
        },
    });
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview[data-thread-local-id="${
                env.invoke('Thread/findFromId', {
                    $$$id: 10,
                    $$$model: 'mail.channel',
                }).localId
            }"]
        `).click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "should have open a chat window"
    );
    assert.containsOnce(
        document.body,
        `.o-ChatWindow[data-thread-local-id="${
            env.invoke('Thread/findFromId', {
                $$$id: 10,
                $$$model: 'mail.channel',
            }).localId
        }"]`,
        "chat window of chat should be open"
    );
    assert.hasClass(
        document.querySelector(`
            .o-ChatWindow[data-thread-local-id="${
                env.invoke('Thread/findFromId', {
                    $$$id: 10,
                    $$$model: 'mail.channel',
                }).localId
            }"]
        `),
        'o-isFocused',
        "chat window of chat should have focus"
    );

    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview[data-thread-local-id="${
                env.invoke('Thread/findFromId', {
                    $$$id: 20,
                    $$$model: 'mail.channel',
                }).localId
            }"]
        `).click()
    );
    assert.containsN(
        document.body,
        '.o-ChatWindow',
        2,
        "should have open a new chat window"
    );
    assert.containsOnce(
        document.body,
        `.o-ChatWindow[data-thread-local-id="${
            env.invoke('Thread/findFromId', {
                $$$id: 20,
                $$$model: 'mail.channel',
            }).localId
        }"]`,
        "chat window of channel should be open"
    );
    assert.containsOnce(
        document.body,
        `.o-ChatWindow[data-thread-local-id="${
            env.invoke('Thread/findFromId', {
                $$$id: 10,
                $$$model: 'mail.channel',
            }).localId
        }"]`,
        "chat window of chat should still be open"
    );
    assert.hasClass(
        document.querySelector(`
            .o-ChatWindow[data-thread-local-id="${
                env.invoke('Thread/findFromId', {
                    $$$id: 20,
                    $$$model: 'mail.channel',
                }).localId
            }"]
        `),
        'o-isFocused',
        "chat window of channel should have focus"
    );
    assert.doesNotHaveClass(
        document.querySelector(`
            .o-ChatWindow[data-thread-local-id="${
                env.invoke('Thread/findFromId', {
                    $$$id: 10,
                    $$$model: 'mail.channel',
                }).localId
            }"]
        `),
        'o-isFocused',
        "chat window of chat should no longer have focus"
    );
});

QUnit.test('open 2 chat windows: check shift operations are available', async function (assert) {
    assert.expect(9);

    // 2 channels are expected to be found in the messaging menu
    // only their existence matters, data are irrelevant
    this.data['mail.channel'].records.push(
        {},
        {}
    );
    await this.start();

    await afterNextRender(() => {
        document.querySelector('.o-MessagingMenu-toggler').click();
    });
    await afterNextRender(() => {
        document.querySelectorAll(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview
        `)[0].click();
    });
    await afterNextRender(() => {
        document.querySelector('.o-MessagingMenu-toggler').click();
    });
    await afterNextRender(() => {
        document.querySelectorAll(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview
        `)[1].click();
    });
    assert.containsN(
        document.body,
        '.o-ChatWindow',
        2,
        "should have opened 2 chat windows"
    );
    assert.containsOnce(
        document.querySelectorAll('.o-ChatWindow')[0],
        '.o-ChatWindowHeader-commandShiftPrev',
        "first chat window should be allowed to shift left"
    );
    assert.containsNone(
        document.querySelectorAll('.o-ChatWindow')[0],
        '.o-ChatWindowHeader-commandShiftNext',
        "first chat window should not be allowed to shift right"
    );
    assert.containsNone(
        document.querySelectorAll('.o-ChatWindow')[1],
        '.o-ChatWindowHeader-commandShiftPrev',
        "second chat window should not be allowed to shift left"
    );
    assert.containsOnce(
        document.querySelectorAll('.o-ChatWindow')[1],
        '.o-ChatWindowHeader-commandShiftNext',
        "second chat window should be allowed to shift right"
    );

    const initialFirstChatWindowThreadLocalId =
        document.querySelectorAll('.o-ChatWindow')[0].dataset.threadLocalId;
    const initialSecondChatWindowThreadLocalId =
        document.querySelectorAll('.o-ChatWindow')[1].dataset.threadLocalId;
    await afterNextRender(() => {
        document.querySelectorAll('.o-ChatWindow')[0]
            .querySelector(':scope .o-ChatWindowHeader-commandShiftPrev')
            .click();
    });
    assert.strictEqual(
        document.querySelectorAll('.o-ChatWindow')[0].dataset.threadLocalId,
        initialSecondChatWindowThreadLocalId,
        "First chat window should be second after it has been shift left"
    );
    assert.strictEqual(
        document.querySelectorAll('.o-ChatWindow')[1].dataset.threadLocalId,
        initialFirstChatWindowThreadLocalId,
        "Second chat window should be first after the first has been shifted left"
    );

    await afterNextRender(() => {
        document.querySelectorAll('.o-ChatWindow')[1]
            .querySelector(':scope .o-ChatWindowHeader-commandShiftNext')
            .click();
    });
    assert.strictEqual(
        document.querySelectorAll('.o-ChatWindow')[0].dataset.threadLocalId,
        initialFirstChatWindowThreadLocalId,
        "First chat window should be back at first place after being shifted left then right"
    );
    assert.strictEqual(
        document.querySelectorAll('.o-ChatWindow')[1].dataset.threadLocalId,
        initialSecondChatWindowThreadLocalId,
        "Second chat window should be back at second place after first one has been shifted left then right"
    );
});

QUnit.test('open 2 folded chat windows: check shift operations are available', async function (assert) {
    /**
     * computation uses following info:
     * ([mocked] global window width: 900px)
     * (others: @see `ChatWindowManager:visual`)
     *
     * - chat window width: 325px
     * - start/end/between gap width: 10px/10px/5px
     * - global width: 900px
     *
     * 2 visible chat windows + hidden menu:
     *  10 + 325 + 5 + 325 + 10 = 675 < 900
     */
    assert.expect(13);

    this.data['mail.channel'].records.push(
        {
            channel_type: 'channel',
            is_minimized: true,
            is_pinned: true,
            state: 'folded',
        },
        {
            channel_type: 'chat',
            is_minimized: true,
            is_pinned: true,
            members: [this.data.currentPartnerId, 7],
            state: 'folded',
        }
    );
    this.data['res.partner'].records.push(
        {
            id: 7,
            name: "Demo",
        }
    );
    await this.start({
        env: {
            browser: {
                innerWidth: 900,
            },
        },
    });
    assert.containsN(
        document.body,
        '.o-ChatWindow',
        2,
        "should have opened 2 chat windows initially"
    );
    assert.hasClass(
        document.querySelector('.o-ChatWindow[data-visible-index="0"]'),
        'o-isFolded',
        "first chat window should be folded"
    );
    assert.hasClass(
        document.querySelector('.o-ChatWindow[data-visible-index="1"]'),
        'o-isFolded',
        "second chat window should be folded"
    );
    assert.containsOnce(
        document.body,
        `
            .o-ChatWindow
            .o-ChatWindowHeader-commandShiftPrev
        `,
        "there should be only one chat window allowed to shift left even if folded"
    );
    assert.containsOnce(
        document.body,
        `
            .o-ChatWindow
            .o-ChatWindowHeader-commandShiftNext
        `,
        "there should be only one chat window allowed to shift right even if folded"
    );

    const initialFirstChatWindowThreadLocalId =
        document.querySelector('.o-ChatWindow[data-visible-index="0"]').dataset.threadLocalId;
    const initialSecondChatWindowThreadLocalId =
        document.querySelector('.o-ChatWindow[data-visible-index="1"]').dataset.threadLocalId;
    await afterNextRender(() =>
        document.querySelector('.o-ChatWindowHeader-commandShiftPrev').click()
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindow[data-visible-index="0"]').dataset.threadLocalId,
        initialSecondChatWindowThreadLocalId,
        "First chat window should be second after it has been shift left"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindow[data-visible-index="1"]').dataset.threadLocalId,
        initialFirstChatWindowThreadLocalId,
        "Second chat window should be first after the first has been shifted left"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatWindowHeader-commandShiftPrev').click()
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindow[data-visible-index="0"]').dataset.threadLocalId,
        initialFirstChatWindowThreadLocalId,
        "First chat window should be back at first place"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindow[data-visible-index="1"]').dataset.threadLocalId,
        initialSecondChatWindowThreadLocalId,
        "Second chat window should be back at second place"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatWindowHeader-commandShiftNext').click()
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindow[data-visible-index="0"]').dataset.threadLocalId,
        initialSecondChatWindowThreadLocalId,
        "First chat window should be second after it has been shift right"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindow[data-visible-index="1"]').dataset.threadLocalId,
        initialFirstChatWindowThreadLocalId,
        "Second chat window should be first after the first has been shifted right"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatWindowHeader-commandShiftNext').click()
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindow[data-visible-index="0"]').dataset.threadLocalId,
        initialFirstChatWindowThreadLocalId,
        "First chat window should be back at first place"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindow[data-visible-index="1"]').dataset.threadLocalId,
        initialSecondChatWindowThreadLocalId,
        "Second chat window should be back at second place"
    );
});

QUnit.test('open 3 different chat windows: not enough screen width', async function (assert) {
    /**
     * computation uses following info:
     * ([mocked] global window width: 900px)
     * (others: @see `ChatWindowManager:visual`)
     *
     * - chat window width: 325px
     * - start/end/between gap width: 10px/10px/5px
     * - hidden menu width: 200px
     * - global width: 1080px
     *
     * Enough space for 2 visible chat windows, and one hidden chat window:
     * 3 visible chat windows:
     *  10 + 325 + 5 + 325 + 5 + 325 + 10 = 1000 < 900
     * 2 visible chat windows + hidden menu:
     *  10 + 325 + 5 + 325 + 10 + 200 + 5 = 875 < 900
     */
    assert.expect(12);

    // 3 channels are expected to be found in the messaging menu, each with a
    // random unique id that will be referenced in the test
    this.data['mail.channel'].records.push(
        { id: 1 },
        { id: 2 },
        { id: 3 }
    );
    const env = await this.start({
        env: {
            browser: {
                innerWidth: 900, // enough to fit 2 chat windows but not 3
            },
        },
    });
    // open, from systray menu, chat windows of channels with Id 1, 2, then 3
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview[data-thread-local-id="${
                env.invoke('Thread/findFromId', {
                    $$$id: 1,
                    $$$model: 'mail.channel',
                }).localId
            }"]
        `).click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "should have open 1 visible chat window"
    );
    assert.containsNone(
        document.body,
        '.o-ChatWindowManager-hiddenMenu',
        "should not have hidden menu"
    );
    assert.containsNone(
        document.body,
        '.o-MessagingMenu-dropdownMenu',
        "messaging menu should be hidden"
    );

    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector(`
            .o-MessagingMenu_dropdownMenu
            .o-NotificationList-preview[data-thread-local-id="${
                env.invoke('Thread/findFromId', {
                    $$$id: 2,
                    $$$model: 'mail.channel',
                }).localId
            }"]
        `).click()
    );
    assert.containsN(
        document.body,
        '.o-ChatWindow',
        2,
        "should have open 2 visible chat windows"
    );
    assert.containsNone(
        document.body,
        '.o-ChatWindowManager-hiddenMenu',
        "should not have hidden menu"
    );
    assert.containsNone(
        document.body,
        '.o-MessagingMenu-dropdownMenu',
        "messaging menu should be hidden"
    );

    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview[data-thread-local-id="${
                env.invoke('Thread/findFromId', {
                    $$$id: 3,
                    $$$model: 'mail.channel',
                }).localId
            }"]
        `).click()
    );
    assert.containsN(
        document.body,
        '.o-ChatWindow',
        2,
        "should have open 2 visible chat windows"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindowManager-hiddenMenu',
        "should have hidden menu"
    );
    assert.containsNone(
        document.body,
        '.o-MessagingMenu-dropdownMenu',
        "messaging menu should be hidden"
    );
    assert.containsOnce(
        document.body,
        `.o-ChatWindow[data-thread-local-id="${
            env.invoke('Thread/findFromId', {
                $$$id: 1,
                $$$model: 'mail.channel',
            }).localId
        }"]`,
        "chat window of channel 1 should be open"
    );
    assert.containsOnce(
        document.body,
        `.o-ChatWindow[data-thread-local-id="${
            env.invoke('Thread/findFromId', {
                $$$id: 3,
                $$$model: 'mail.channel',
            }).localId
        }"]`,
        "chat window of channel 3 should be open"
    );
    assert.hasClass(
        document.querySelector(`
            .o-ChatWindow[data-thread-local-id="${
                env.invoke('Thread/findFromId', {
                    $$$id: 3,
                    $$$model: 'mail.channel',
                }).localId
            }"]
        `),
        'o-isFocused',
        "chat window of channel 3 should have focus"
    );
});

QUnit.test('chat window: switch on TAB', async function (assert) {
    assert.expect(10);

    // 2 channels are expected to be found in the messaging menu
    // with random unique id and name that will be asserted during the test
    this.data['mail.channel'].records.push(
        {
            id: 1,
            name: "channel1",
        },
        {
            id: 2,
            name: "channel2",
        }
    );
    const env = await this.start();
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview[data-thread-local-id="${
                env.invoke('Thread/findFromId', {
                    $$$id: 1,
                    $$$model: 'mail.channel',
                }).localId
            }"]`
        ).click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "only 1 chatWindow must be opened"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindowHeader-name').textContent,
        'channel1',
        "the name of the only chatWindow should be 'channel1' (channel with ID 1)"
    );
    assert.strictEqual(
        document.querySelector('.o-ComposerTextInput-textarea'),
        document.activeElement,
        "the chatWindow composer must have focus"
    );

    await afterNextRender(() =>
        triggerEvent(
            document.querySelector('.o-ComposerTextInput-textarea'),
            'keydown',
            { key: 'Tab' },
        )
    );
    assert.strictEqual(
        document.querySelector('.o-ComposerTextInput-textarea'),
        document.activeElement,
        "the chatWindow composer still has focus"
    );

    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview[data-thread-local-id="${
                env.invoke('Thread/findFromId', {
                    $$$id: 2,
                    $$$model: 'mail.channel',
                }).localId
            }"]`
        ).click()
    );
    assert.containsN(
        document.body,
        '.o-ChatWindow',
        2,
        "2 chatWindows must be opened"
    );
    const chatWindows = document.querySelectorAll('.o-ChatWindow');
    assert.strictEqual(
        chatWindows[0].querySelector(':scope .o-ChatWindowHeader-name').textContent,
        'channel1',
        "the name of the 1st chatWindow should be 'channel1' (channel with ID 1)"
    );
    assert.strictEqual(
        chatWindows[1].querySelector(':scope .o-ChatWindowHeader-name').textContent,
        'channel2',
        "the name of the 2nd chatWindow should be 'channel2' (channel with ID 2)"
    );
    assert.strictEqual(
        chatWindows[1].querySelector(':scope .o-ComposerTextInput-textarea'),
        document.activeElement,
        "the 2nd chatWindow composer must have focus (channel with ID 2)"
    );

    await afterNextRender(() =>
        triggerEvent(
            chatWindows[1].querySelector(':scope .o-ComposerTextInput-textarea'),
            'keydown',
            { key: 'Tab' },
        )
    );
    assert.containsN(
        document.body,
        '.o-ChatWindow',
        2,
        "2 chatWindows should still be opened"
    );
    assert.strictEqual(
        chatWindows[0].querySelector(':scope .o-ComposerTextInput-textarea'),
        document.activeElement,
        "the 1st chatWindow composer must have focus (channel with ID 1)"
    );
});

QUnit.test('chat window: TAB cycle with 3 open chat windows [REQUIRE FOCUS]', async function (assert) {
    // Note: in LTR, chat windows are placed from right to left. TAB cycling
    // should move from left to right in this configuration, therefore cycling
    // moves to following lower index.
    /**
     * InnerWith computation uses following info:
     * ([mocked] global window width: @see `mail/static/src/utils/test-utils.js:start()` method)
     * (others: @see `ChatWindowManager:visual`)
     *
     * - chat window width: 325px
     * - start/end/between gap width: 10px/10px/5px
     * - hidden menu width: 200px
     * - global width: 1920px
     *
     * Enough space for 3 visible chat windows:
     *  10 + 325 + 5 + 325 + 5 + 325 + 10 = 1000 < 1920
     */
    assert.expect(6);

    this.data['mail.channel'].records.push(
        {
            is_minimized: true,
            is_pinned: true,
            state: 'open',
        },
        {
            is_minimized: true,
            is_pinned: true,
            state: 'open',
        },
        {
            is_minimized: true,
            is_pinned: true,
            state: 'open',
        }
    );
    await this.start({
        env: {
            browser: {
                innerWidth: 1920,
            },
        },
    });
    assert.containsN(
        document.body,
        `
            .o-ChatWindow
            .o-ComposerTextInput-textarea
        `,
        3,
        "initialy, 3 chat windows should be present"
    );
    assert.containsNone(
        document.body,
        '.o-ChatWindow.o-isFolded',
        "all 3 chat windows should be open (unfolded)"
    );

    await afterNextRender(() => {
        document.querySelector(`
            .o-ChatWindow[data-visible-index='2']
            .o-ComposerTextInput-textarea
        `).focus();
    });
    assert.strictEqual(
        document.querySelector(`
            .o-ChatWindow[data-visible-index='2']
            .o-ComposerTextInput-textarea
        `),
        document.activeElement,
        "The 3rd chat window should have the focus"
    );

    await afterNextRender(() =>
        triggerEvent(
            document.querySelector(`
                .o-ChatWindow[data-visible-index='2']
                .o-ComposerTextInput-textarea
            `),
            'keydown',
            { key: 'Tab' },
        )
    );
    assert.strictEqual(
        document.querySelector(`
            .o-ChatWindow[data-visible-index='1']
            .o-ComposerTextInput-textarea
        `),
        document.activeElement,
        "after pressing tab on the 3rd chat window, the 2nd chat window should have focus"
    );

    await afterNextRender(() =>
        triggerEvent(
            document.querySelector(`
                .o-ChatWindow[data-visible-index='1']
                .o-ComposerTextInput-textarea
            `),
            'keydown',
            { key: 'Tab' },
        )
    );
    assert.strictEqual(
        document.querySelector(`
            .o-ChatWindow[data-visible-index='0']
            .o-ComposerTextInput-textarea
        `),
        document.activeElement,
        "after pressing tab on the 2nd chat window, the 1st chat window should have focus"
    );

    await afterNextRender(() =>
        triggerEvent(
            document.querySelector(`
                .o-ChatWindow[data-visible-index='0']
                .o-ComposerTextInput-textarea
            `),
            'keydown',
            { key: 'Tab' },
        )
    );
    assert.strictEqual(
        document.querySelector(`
            .o-ChatWindow[data-visible-index='2']
            .o-ComposerTextInput-textarea
        `),
        document.activeElement,
        "the 3rd chat window should have the focus after pressing tab on the 1st chat window"
    );
});

QUnit.test('chat window with a thread: keep scroll position in message list on folded', async function (assert) {
    assert.expect(3);

    // channel that is expected to be found in the messaging menu
    // with a random unique id, needed to link messages
    this.data['mail.channel'].records.push(
        { id: 20 });
    for (let i = 0; i < 10; i++) {
        this.data['mail.message'].records.push(
            {
                body: "not empty",
                channel_ids: [20],
            }
        );
    }
    await this.start();
    await afterNextRender(() => document.querySelector('.o-MessagingMenu-toggler').click());
    await this.afterEvent({
        eventName: 'o-component-message-list-scrolled',
        func: () => document.querySelector('.o-NotificationList-preview').click(),
        message: "should wait until channel 20 scrolled to its last message after opening it from the messaging menu",
        predicate: ({ scrollTop, threadViewer }) => {
            const messageList = document.querySelector('.o-ThreadView-messageList');
            return (
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20 &&
                scrollTop === messageList.scrollHeight - messageList.clientHeight
            );
        },
    });
    // Set a scroll position to chat window
    await this.afterEvent({
        eventName: 'o-component-message-list-scrolled',
        func: () => {
            document.querySelector('.o-ThreadView-messageList').scrollTop = 142;
        },
        message: "should wait until channel 20 scrolled to 142 after setting this value manually",
        predicate: ({ scrollTop, threadViewer }) => {
            return (
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20 &&
                scrollTop === 142
            );
        },
    });
    assert.strictEqual(
        document.querySelector('.o-ThreadView-messageList').scrollTop,
        142,
        "verify chat window initial scrollTop"
    );

    // fold chat window
    await afterNextRender(() => document.querySelector('.o-ChatWindow-header').click());
    assert.containsNone(
        document.body,
        '.o-ThreadView',
        "chat window should be folded so no ThreadView should be present"
    );

    // unfold chat window
    await afterNextRender(() => this.afterEvent({
        eventName: 'o-component-message-list-scrolled',
        func: () => document.querySelector('.o-ChatWindow-header').click(),
        message: "should wait until channel 20 restored its scroll position to 142",
        predicate: ({ scrollTop, threadViewer }) => {
            return (
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20 &&
                scrollTop === 142
            );
        },
    }));
    assert.strictEqual(
        document.querySelector('.o-ThreadView-messageList').scrollTop,
        142,
        "chat window scrollTop should still be the same when chat window is unfolded"
    );
});

QUnit.test('chat window should scroll to the newly posted message just after posting it', async function (assert) {
    assert.expect(1);

    this.data['mail.channel'].records.push(
        {
            id: 20,
            is_minimized: true,
            state: 'open',
        }
    );
    for (let i = 0; i < 10; i++) {
        this.data['mail.message'].records.push(
            {
                body: "not empty",
                channel_ids: [20],
            }
        );
    }
    await this.start();

    // Set content of the composer of the chat window
    await afterNextRender(() => {
        document.querySelector('.o-ComposerTextInput-textarea').focus();
        document.execCommand('insertText', false, 'WOLOLO');
    });
    // Send a new message in the chatwindow to trigger the scroll
    await afterNextRender(() =>
        triggerEvent(
            document.querySelector('.o-ComposerTextInput-textarea'),
            'keydown',
            { key: 'Enter' },
        )
    );
    const messageList = document.querySelector('.o-MessageList');
    assert.strictEqual(
        messageList.scrollHeight - messageList.scrollTop,
        messageList.clientHeight,
        "chat window should scroll to the newly posted message just after posting it"
    );
});

QUnit.test('[technical] chat window: composer state conservation on toggle home menu when folded', async function (assert) {
    // technical as show/hide home menu simulation are involved and home menu implementation
    // have side-effects on DOM that may make chat window components not work
    assert.expect(6);

    // channel that is expected to be found in the messaging menu
    // only its existence matters, data are irrelevant
    this.data['mail.channel'].records.push(
        {}
    );
    await this.start();
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await afterNextRender(() =>
        document.querySelector(`
            .o-MessagingMenu-dropdownMenu
            .o-NotificationList-preview
        `).click()
    );
    // Set content of the composer of the chat window
    await afterNextRender(() => {
        document.querySelector('.o-ComposerTextInput-textarea').focus();
        document.execCommand('insertText', false, 'XDU for the win !');
    });
    // Set attachments of the composer
    const files = [
        await createFile({
            name: 'text state conservation on toggle home menu.txt',
            content: 'hello, world',
            contentType: 'text/plain',
        }),
        await createFile({
            name: 'text2 state conservation on toggle home menu.txt',
            content: 'hello, xdu is da best man',
            contentType: 'text/plain',
        })
    ];
    await afterNextRender(() =>
        inputFiles(
            document.querySelector('.o-FileUploader-input'),
            files
        )
    );
    assert.strictEqual(
        document.querySelector('.o-ComposerTextInput-textarea').value,
        "XDU for the win !",
        "verify chat window composer initial html input"
    );
    assert.containsN(
        document.body,
        `
            .o-Composer
            .o-Attachment
        `,
        2,
        "verify chat window composer initial attachment count"
    );

    // fold chat window
    await afterNextRender(() => document.querySelector('.o-ChatWindow-header').click());
    await this.hideHomeMenu();
    // unfold chat window
    await afterNextRender(() => document.querySelector('.o-ChatWindow-header').click());
    assert.strictEqual(
        document.querySelector('.o-ComposerTextInput-textarea').value,
        "XDU for the win !",
        "Chat window composer should still have the same input after hiding home menu"
    );
    assert.containsN(
        document.body,
        `
            .o-Composer
            .o-Attachment
        `,
        2,
        "Chat window composer should have 2 attachments after hiding home menu"
    );

    // fold chat window
    await afterNextRender(() => document.querySelector('.o-ChatWindow-header').click());
    await this.showHomeMenu();
    // unfold chat window
    await afterNextRender(() => document.querySelector('.o-ChatWindow-header').click());
    assert.strictEqual(
        document.querySelector('.o-ComposerTextInput-textarea').value,
        "XDU for the win !",
        "chat window composer should still have the same input after showing home menu"
    );
    assert.containsN(
        document.body,
        `
            .o-Composer
            .o-Attachment
        `,
        2,
        "Chat window composer should have 2 attachments after showing home menu"
    );
});

QUnit.test('[technical] chat window with a thread: keep scroll position in message list on toggle home menu when folded', async function (assert) {
    // technical as show/hide home menu simulation are involved and home menu implementation
    // have side-effects on DOM that may make chat window components not work
    assert.expect(2);

    // channel that is expected to be found in the messaging menu
    // with random unique id, needed to link messages
    this.data['mail.channel'].records.push(
        { id: 20 }
    );
    for (let i = 0; i < 10; i++) {
        this.data['mail.message'].records.push(
            {
                body: "not empty",
                channel_ids: [20],
            }
        );
    }
    await this.start();
    await afterNextRender(() =>
        document.querySelector('.o-MessagingMenu-toggler').click()
    );
    await this.afterEvent({
        eventName: 'o-component-message-list-scrolled',
        func: () => document.querySelector('.o-NotificationList-preview').click(),
        message: "should wait until channel 20 scrolled to its last message after opening it from the messaging menu",
         predicate: ({ scrollTop, threadViewer }) => {
            const messageList = document.querySelector('.o-ThreadView-messageList');
            return (
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20 &&
                scrollTop === messageList.scrollHeight - messageList.clientHeight
            );
        },
    });
    // Set a scroll position to chat window
    await this.afterEvent({
        eventName: 'o-component-message-list-scrolled',
        func: () => document.querySelector('.o-ThreadView-messageList').scrollTop = 142,
        message: "should wait until channel 20 scrolled to 142 after setting this value manually",
        predicate: ({ scrollTop, threadViewer }) => {
            return (
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20 &&
                scrollTop === 142
            );
        },
    });
    // fold chat window
    await afterNextRender(() =>
        document.querySelector('.o-ChatWindow-header').click()
    );
    await this.hideHomeMenu();
    // unfold chat window

    await this.afterEvent({
        eventName: 'o-component-message-list-scrolled',
        func: () => document.querySelector('.o-ChatWindow-header').click(),
        message: "should wait until channel 20 restored its scroll to 142 after unfolding it",
        predicate: ({ scrollTop, threadViewer }) => {
            return (
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20 &&
                scrollTop === 142
            );
        },
    });
    assert.strictEqual(
        document.querySelector('.o-ThreadView-messageList').scrollTop,
        142,
        "chat window scrollTop should still be the same after home menu is hidden"
    );

    // fold chat window
    await afterNextRender(() =>
        document.querySelector('.o-ChatWindow-header').click()
    );
    // Show home menu
    await this.showHomeMenu();
    // unfold chat window
    await this.afterEvent({
        eventName: 'o-component-message-list-scrolled',
        func: () => document.querySelector('.o-ChatWindow-header').click(),
        message: "should wait until channel 20 restored its scroll position to the last saved value (142)",
        predicate: ({ scrollTop, threadViewer }) => {
            return (
                threadViewer.$$$thread().$$$model() === 'mail.channel' &&
                threadViewer.$$$thread().$$$id() === 20 &&
                scrollTop === 142
            );
        },
    });
    assert.strictEqual(
        document.querySelector('.o-ThreadView-messageList').scrollTop,
        142,
        "chat window scrollTop should still be the same after home menu is shown"
    );
});

QUnit.test('chat window does not fetch messages if hidden', async function (assert) {
    /**
     * computation uses following info:
     * ([mocked] global window width: 900px)
     * (others: @see `ChatWindowManager:visual`)
     *
     * - chat window width: 325px
     * - start/end/between gap width: 10px/10px/5px
     * - hidden menu width: 200px
     * - global width: 1080px
     *
     * Enough space for 2 visible chat windows, and one hidden chat window:
     * 3 visible chat windows:
     *  10 + 325 + 5 + 325 + 5 + 325 + 10 = 1000 > 900
     * 2 visible chat windows + hidden menu:
     *  10 + 325 + 5 + 325 + 10 + 200 + 5 = 875 < 900
     */
    assert.expect(14);

    // 3 channels are expected to be found in the messaging menu, each with a
    // random unique id that will be referenced in the test
    this.data['mail.channel'].records.push(
        {
            id: 10,
            is_minimized: true,
            name: "Channel #10",
            state: 'open',
        },
        {
            id: 11,
            is_minimized: true,
            name: "Channel #11",
            state: 'open',
        },
        {
            id: 12,
            is_minimized: true,
            name: "Channel #12",
            state: 'open',
        },
    );
    const env = await this.start({
        env: {
            browser: {
                innerWidth: 900,
            },
        },
        mockRPC(route, args) {
            if (args.method === 'message_fetch') {
                // domain should be like [['channel_id', 'in', [X]]] with X the channel id
                const channel_ids = args.kwargs.domain[0][2];
                assert.strictEqual(
                    channel_ids.length,
                    1,
                    "messages should be fetched channel per channel"
                );
                assert.step(`rpc:message_fetch:${channel_ids[0]}`);
            }
            return this._super(...arguments);
        },
    });

    assert.containsN(
        document.body,
        '.o-ChatWindow',
        2,
        "2 chat windows should be visible"
    );
    assert.containsNone(
        document.body,
        `.o-ChatWindow[data-thread-local-id="${
            env.invoke('Thread/findFromId', {
                $$$id: 12,
                $$$model: 'mail.channel',
            }).localId
        }"]`,
        "chat window for Channel #12 should be hidden"
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindowHiddenMenu',
        "chat window hidden menu should be displayed"
    );
    assert.verifySteps(
        [
            'rpc:message_fetch:10',
            'rpc:message_fetch:11',
        ],
        "messages should be fetched for the two visible chat windows"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatWindowHiddenMenu-dropdownToggle').click()
    );
    assert.containsOnce(
        document.body,
        '.o-ChatWindowHiddenMenu-chatWindowHeader',
        "1 hidden chat window should be listed in hidden menu"
    );

    await afterNextRender(() =>
        document.querySelector('.o-ChatWindowHiddenMenu-chatWindowHeader').click()
    );
    assert.containsN(
        document.body,
        '.o-ChatWindow',
        2,
        "2 chat windows should still be visible"
    );
    assert.containsOnce(
        document.body,
        `.o-ChatWindow[data-thread-local-id="${
            env.invoke('Thread/findFromId', {
                $$$id: 12,
                $$$model: 'mail.channel',
            }).localId
        }"]`,
        "chat window for Channel #12 should now be visible"
    );
    assert.verifySteps(
        ['rpc:message_fetch:12'],
        "messages should now be fetched for Channel #12"
    );
});

QUnit.test('new message separator is shown in a chat window of a chat on receiving new message', async function (assert) {
    assert.expect(6);

    this.data['mail.channel'].records.push(
        {
            channel_type: 'chat',
            id: 10,
            is_minimized: true,
            is_pinned: false,
            members: [this.data.currentPartnerId, 10],
            uuid: 'channel-10-uuid',
        }
    );
    this.data['res.partner'].records.push(
        {
            id: 10,
            name: "Demo",
        }
    );
    this.data['res.users'].records.push(
        {
            id: 42,
            name: "Foreigner user",
            partner_id: 10,
        }
    );
    const env = await this.start({
        mockRPC(route, args) {
            if (args.method === 'channel_fold') {
                const uuid = args.kwargs.uuid;
                assert.strictEqual(
                    uuid,
                    'channel-10-uuid',
                    "chat window fold state should have been sent to server"
                );
                assert.step(`rpc:channel_fold:${uuid}`);
            }
            return this._super(...arguments);
        },
    });

    // simulate receiving a message
    await afterNextRender(async () => env.services.rpc({
        route: '/mail/chat_post',
        params: {
            context: {
                mockedUserId: 42,
            },
            message_content: "hu",
            uuid: 'channel-10-uuid',
        },
    }));
    assert.containsOnce(
        document.body,
        '.o-ChatWindow',
        "a chat window should be visible after receiving a new message from a chat"
    );
    assert.containsOnce(
        document.body,
        '.o-Message',
        "chat window should have a single message (the newly received one)"
    );
    assert.containsOnce(
        document.body,
        '.o-MessageList-separatorNewMessages',
        "should display 'new messages' separator in the conversation, from reception of new messages"
    );
    assert.verifySteps(
        ['rpc:channel_fold:channel-10-uuid'],
        "fold state of chat window of chat should have been updated to server"
    );
});

QUnit.test('focusing a chat window of a chat should make new message separator disappear [REQUIRE FOCUS]', async function (assert) {
    assert.expect(2);

    this.data['mail.channel'].records.push(
        {
            channel_type: 'chat',
            id: 10,
            is_minimized: true,
            is_pinned: false,
            members: [this.data.currentPartnerId, 10],
            message_unread_counter: 0,
            uuid: 'channel-10-uuid',
        }
    );
    this.data['res.partner'].records.push(
        {
            id: 10,
            name: "Demo",
        }
    );
    this.data['res.users'].records.push(
        {
            id: 42,
            name: "Foreigner user",
            partner_id: 10,
        }
    );
    const env = await this.start();

    // simulate receiving a message
    await afterNextRender(
        () => env.services.rpc({
            route: '/mail/chat_post',
            params: {
                context: {
                    mockedUserId: 42,
                },
                message_content: "hu",
                uuid: 'channel-10-uuid',
            },
        })
    );
    assert.containsOnce(
        document.body,
        '.o-MessageList-separatorNewMessages',
        "should display 'new messages' separator in the conversation, from reception of new messages"
    );

    await afterNextRender(() => this.afterEvent({
        eventName: 'o-thread-last-seen-by-current-partner-message-id-changed',
        func: () => document.querySelector('.o-ComposerTextInput-textarea').focus(),
        message: "should wait until last seen by current partner message id changed",
        predicate: ({ thread }) => {
            return (
                thread.$$$id() === 10 &&
                thread.$$$model() === 'mail.channel'
            );
        },
    }));
    assert.containsNone(
        document.body,
        '.o-MessageList_separatorNewMessages',
        "new message separator should no longer be shown, after focus on composer text input of chat window"
    );
});

QUnit.test('chat window: click on correspondent name in chat header redirects to user form', async function (assert) {
    assert.expect(4);

    this.data['mail.channel'].records.push(
        {
            channel_type: 'chat',
            is_minimized: true,
            members: [this.data.currentPartnerId, 7],
        }
    );
    this.data['res.partner'].records.push(
        {
            id: 7,
            name: "Demo",
        }
    );
    const partnerFormDeferred = makeTestPromise();
    const bus = new Bus();
    bus.on('do-action', null, payload => {
        assert.step('do-action:open_partner_form');
        assert.deepEqual(
            payload.action,
            {
                res_id: 7,
                res_model: 'res.partner',
                type: 'ir.actions.act_window',
                views: [[false, 'form']]
            },
            "opened form view should be the form view displaying the clicked correspondent (partner 7)"
        );
        partnerFormDeferred.resolve();
    });
    await this.start({ env: { bus } });
    const chatWindowHeaderName = document.querySelector('.o-ChatWindowHeader-name');
    assert.hasClass(
        chatWindowHeaderName,
        'o-isClickable',
        "name of thread in header part of chat window should be clickable when thread has a single correspondent"
    );

    await chatWindowHeaderName.click();
    await partnerFormDeferred;
    assert.verifySteps(
        ['do-action:open_partner_form'],
        "should open partner form on click of chat header name when the thread has single correspondent"
    );
});

QUnit.test('chat window: chat header should not be clickable when thread has multiple correspondents', async function (assert) {
    assert.expect(1);

    this.data['mail.channel'].records.push(
        {
            channel_type: 'channel',
            is_minimized: true,
            members: [this.data.currentPartnerId, 7, 8],
        }
    );
    this.data['res.partner'].records.push(
        {
            id: 7,
            name: "Demo",
        },
        {
            id: 8,
            name: "Portal",
        }
    );
    await this.start();

    const chatWindowHeader = document.querySelector('.o-ChatWindowHeader-name');
    assert.doesNotHaveClass(
        chatWindowHeader,
        'o-isClickable',
        "name of thread in header part of chat window should not be clickable when thread has multiple correspondents"
    );
});

QUnit.test('textual representations of shift previous/next operations are correctly mapped to left/right in LTR locale', async function (assert) {
    assert.expect(2);

    this.data['mail.channel'].records.push(
        { is_minimized: true },
        { is_minimized: true },
    );
    await this.start();

    assert.strictEqual(
        document.querySelector('.o-ChatWindowHeader-commandShiftPrev').title,
        "Shift left",
        "shift previous operation should be have 'Shift left' as title in LTR locale"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindowHeader-commandShiftNext').title,
        "Shift right",
        "shift next operation should have 'Shift right' as title in LTR locale"
    );
});

QUnit.test('textual representations of shift previous/next operations are correctly mapped to right/left in RTL locale', async function (assert) {
    assert.expect(2);

    this.data['mail.channel'].records.push(
        { is_minimized: true },
        { is_minimized: true },
    );
    await this.start({
        env: {
            _t: Object.assign((s => s), {
                database: {
                    parameters: {
                        code: "en_US",
                        date_format: '%m/%d/%Y',
                        decimal_point: ".",
                        direction: 'rtl',
                        grouping: [],
                        thousands_sep: ",",
                        time_format: '%H:%M:%S',
                    },
                },
            }),
        }
    });

    assert.strictEqual(
        document.querySelector('.o-ChatWindowHeader-commandShiftPrev').title,
        "Shift right",
        "shift previous operation should have 'Shift right' as title in RTL locale"
    );
    assert.strictEqual(
        document.querySelector('.o-ChatWindowHeader-commandShiftNext').title,
        "Shift left",
        "shift next operation should have 'Shift left' as title in RTL locale"
    );
});

});
});
});

});
