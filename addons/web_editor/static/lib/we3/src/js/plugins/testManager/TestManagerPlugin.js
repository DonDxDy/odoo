(function () {
'use strict';

const regex = we3.utils.regex.TestManagerPlugin;

function deepEqual(v1, v2) {
    if (v1 === v2) {
        return true;
    }
    if (typeof v1 === 'object' && typeof v2 === 'object') {
        var k1 = Object.keys(v1);
        var k2 = Object.keys(v2);
        if (k1.length !== k2.length) {
            return false;
        }
        for (var i = 0; i < k1.length; i++) {
            var key = k1[i];
            if (!deepEqual(v1[key], v2[key])) {
                return false;
            }
        }
        return true;
    }
}
function log (result, testName, value, expectedValue) {
    if (testName.startsWith('<')) {
        console.info('%cTEST: ' + testName, 'background-color: grey; color: black; padding: 2px;');
    } else if (result === true) {
        console.info('%cTEST: ' + testName, 'color: green;');
    } else if (result === false) {
        // escape invisible chars
        if (typeof expectedValue === 'string') {
            expectedValue = expectedValue.replace(/\u00A0/g, '&nbsp;').replace(/\uFEFF/g, '&#65279;');
        }
        if (typeof value === 'string') {
            value = value.replace(/\u00A0/g, '&nbsp;').replace(/\uFEFF/g, '&#65279;');
        }
        console.error('TEST: ', testName, '\nExpected:\n', expectedValue, '\nResult:\n' + value);
    }
}
/**
 * Get the event type based on its name.
 *
 * @private
 * @param {string} eventName
 * @returns string
 *  'mouse' | 'keyboard' | 'unknown'
 */
function _eventType(eventName) {
    var types = {
        mouse: ['click', 'mouse', 'pointer', 'contextmenu', 'select', 'wheel'],
        composition: ['composition'],
        input: ['input'],
        keyboard: ['key'],
    };
    var type = 'unknown';
    Object.keys(types).forEach(function (key, index) {
        var isType = types[key].some(function (str) {
            return eventName.toLowerCase().indexOf(str) !== -1;
        });
        if (isType) {
            type = key;
        }
    });
    return type;
}
function _eventKeyName(eventName) {
    eventName = eventName.toLowerCase();
    if (eventName.indexOf('left') !== -1) {
        return 'ArrowLeft'
    }
    if (eventName.indexOf('right') !== -1) {
        return 'ArrowRight'
    }
    return eventName.substr(0,1).toUpperCase() + eventName.substr(1, eventName.length);
}

class TestManagerPlugin extends we3.AbstractPlugin {
    /**
     *@param {Object} options
     *@param {Object} options.test
     *@param {boolean} options.test.auto start automatically all tests
     *@param {Object} options.test.assert
     *@param {function} options.test.assert.ok
     *@param {function} options.test.assert.notOk
     *@param {function} options.test.assert.strictEqual
     *@param {function} options.test.assert.deepEqual
     *@param {function} options.test.callback called at the test ending
     **/
    constructor (parent, params, options) {
        super(...arguments)
        var self = this;
        this.dependencies = ['Arch', 'Range', 'Rules', 'Renderer'];

        this.templatesDependencies = ['src/xml/test.xml'];
        this.buttons = {
            template: 'we3.buttons.test',
        };

        this._plugins = [this];
        this._allPluginsAreReady = false;
        this._complete = false;


        this.nTests = 0;
        this.nOKTests = 0;

        this.assert = {
            ok (value, testName) {
                self.nTests++;
                var didPass = !!value;
                if (self.options.test && self.options.test.assert) {
                    self.options.test.assert.ok(value, testName);
                } else {
                    log(didPass, testName, value, true);
                }
                if (didPass) {
                    self.nOKTests++;
                }
            },
            notOk (value, testName) {
                self.nTests++;
                var didPass = !value;
                if (self.options.test && self.options.test.assert) {
                    self.options.test.assert.notOk(value, testName);
                } else {
                    log(didPass, testName, value, false);
                }
                if (didPass) {
                    self.nOKTests++;
                }
            },
            strictEqual (value, expectedValue, testName) {
                self.nTests++;
                var didPass = value === expectedValue;
                if (self.options.test && self.options.test.assert) {
                    self.options.test.assert.strictEqual(value, expectedValue, testName);
                } else {
                    log(didPass, testName, value, expectedValue);
                }
                if (didPass) {
                    self.nOKTests++;
                }
            },
            deepEqual (value, expectedValue, testName) {
                self.nTests++;
                var didPass = deepEqual(value, expectedValue);
                if (self.options.test && self.options.test.assert) {
                    self.options.test.assert.deepEqual(value, expectedValue, testName);
                } else {
                    log(didPass, testName, value, expectedValue);
                }
                if (didPass) {
                    self.nOKTests++;
                }
            },
        };
    }
    start () {
        var promise = super.start();
        this.dependencies.Rules.addStructureRule({
            nodes: {
                methods: ['isTestNode'],
            },
            permittedParents: {
                methods: ['isTrue'],
            },
        });
        this.dependencies.Rules.addUnbreakableNodeCheck(function (ArchNode) {
            return ArchNode.className && ArchNode.className.contains('unbreakable');
        });
        this.dependencies.Rules.addEditableNodeCheck(function (ArchNode) {
            if (ArchNode.className) {
                if (ArchNode.className.contains('editable')) {
                    return true;
                }
                if (ArchNode.className.contains('noteditable')) {
                    return false;
                }
            }
        });
        return promise;
    }
    setEditorValue () {
        if (this._allPluginsAreReady) {
            return;
        }
        this._allPluginsAreReady = true;

        if (this.buttons.elements) {
            var dropdown = this.buttons.elements[0].querySelector("we3-vertical-items");
            var sortedPlugins = this._plugins.slice().sort(function (a, b) {
                return a.pluginName.toUpperCase() < b.pluginName.toUpperCase() ? -1 : 1;
            });
            sortedPlugins.forEach(function (plugin) {
                var button = document.createElement('we3-button');
                button.setAttribute('data-method', 'loadTest');
                button.setAttribute('data-value', plugin.pluginName);
                button.setAttribute('no-transaction', 'true');
                var buttonName = plugin.pluginName;
                if (buttonName !== 'Test') {
                    buttonName = buttonName.replace('Test', '')
                        .replace(/([A-Z][^A-Z])/g, ' $1').trim();
                }
                button.innerHTML = buttonName + '&nbsp;';
                button.appendChild(document.createElement('small'));
                dropdown.appendChild(button);
            });
        }

        if (this.options.test && this.options.test.auto) {
            setTimeout(this.loadTest.bind(this, null));
        }
    }
    destroy () {
        if (this.options.test && this.options.test.auto) {
            if (!this._complete) {
                this.assert.notOk(true, "The editor are destroyed before all tests are complete");
                this._terminate();
            } else {
                this.assert.ok(true, "The plugin 'Test' are destroyed");
            }
        }
        super.destroy();
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Add a test plugin.
     *
     * @param {Plugin} plugin
     */
    add (plugin) {
        this._plugins.push(plugin);
    }
    async click (target, DOMRangeOffset) {
        var self = this;
        var node = !target || target.tagName ? target : target.parentNode;
        if (!node) {
            return;
        }
        await this.triggerNativeEvents(node, 'mousedown', {
            afterEvent: function (ev) {
                if (!ev.defaultPrevented) {
                    self._selectRange(target, DOMRangeOffset|0);
                    ev.target.focus();
                }
            }
        });
        await this.triggerNativeEvents(node, 'mouseup');
        await this.triggerNativeEvents(node, 'click');
    }
    /**
     * Execute tests.
     *
     * @param {Object} assert
     * @param {Object []} tests
     * @returns {Promise}
     */
    async execTests (assert, tests) {
        var self = this;
        var defPollTest = Promise.resolve();
        tests.forEach((test) => defPollTest = defPollTest.then(this._pollTest.bind(this, this.assert, test)));
        return defPollTest;
    }
    getValue (archNodeId) {
        var range = this.dependencies.Range.getRange();

        var container = this.dependencies.Arch.getClonedArchNode(this._getTestContainer(archNodeId), true);
        var markers;
        if (range.isCollapsed() && range.scArch.isVoidoid()) {
            markers = [
                {
                    id: range.scArch.parent.id,
                    offset: range.scArch.index(),
                    string: regex.rangeStartMarker,
                },
                {
                    id: range.ecArch.parent.id,
                    offset: range.ecArch.index() + 1,
                    string: regex.rangeEndMarker,
                },
            ];
        } else {
            markers = [
                {
                    id: range.scID,
                    offset: range.so,
                    string: regex.rangeStartMarker,
                },
                {
                    id: range.ecID,
                    offset: range.eo,
                    string: regex.rangeEndMarker,
                },
            ];
        }
        var result = container.toString({ markers: markers });
        return this._cleanValue(result)
            .replace(/^<[^>]+>/, '').replace(/<\/[^>]+>$/, '') // remove container
            .replace(regex.rangeToCollapsed, regex.rangeCollapsedMarker);
    }
    getDomValue (archNodeId) {
        var el = this.dependencies.Renderer.getElement(this._getTestContainer());
        var xml = new XMLSerializer().serializeToString(el);
        xml = xml.replace(/ \/>|><\/iframe>/g, '/>').replace(/^<[^>]+>/, '').replace(/<[^>]+>$/, '');
        return this._cleanValue(xml);
    }
    /**
     * Trigger a keydown event on the target.
     *
     * @param {Node} target
     * @param {Object} keyPress
     * @returns {Node} target
     */
    async keydown (target, keyPress) {
        target = target.tagName ? target : target.parentNode;
        if (!keyPress.keyCode) {
            for (var keyCode in this.utils.keyboardMap) {
                if (this.utils.keyboardMap[keyCode] === keyPress.key) {
                    keyPress.keyCode = +keyCode;
                    break;
                }
            }
        } else {
            keyPress.key = this.utils.keyboardMap[keyPress.keyCode] || String.fromCharCode(keyPress.keyCode);
        }

        keyPress.keyCode = keyPress.keyCode;

        var ev = await this.triggerNativeEvents(target, 'keydown', keyPress);
        if (!ev.defaultPrevented) {
            await this.triggerNativeEvents(target, 'keypress', keyPress);
        }

        await new Promise(setTimeout);
        await this.triggerNativeEvents(target.parentNode ? target : this.editable, 'keyup', keyPress);
        await new Promise(setTimeout);

        return target;
    }
    /**
     * Load a test.
     *
     * @private
     * @param {Plugin} plugin
     * @returns {Promise}
     */
    async loadTest (pluginName) {
        if (this.isDestroyed()) {
            return;
        }

        await new Promise(function (resolve) { // wait for mouseup test menu
            setTimeout(resolve, 200);
        });

        var value = this.dependencies.Arch.getValue();
        var range = this.dependencies.Range.getRange();
        var sp = range.scArch.path();
        var ep = range.ecArch.path();

        if (pluginName) {
            var plugin;
            if (pluginName === 'Test') {
                plugin = this;
            } else {
                plugin = this._plugins.find(function (plugin) {
                    return plugin.pluginName === pluginName;
                });
            }
            await this._loadTest(plugin);
            this.triggerUp('set_value', {value: value});
        } else {
            await this._loadTests(value);
        }

        var s = this.dependencies.Arch.getClonedArchNode(1).applyPath(sp);
        if (!s) {
            return;
        }
        var e = this.dependencies.Arch.getClonedArchNode(1).applyPath(ep);
        var el = this.dependencies.Renderer.getElement(s.id);
        if (el && this.document.body.contains(el)) {
            this.dependencies.Range.setRange({
                scID: s.id,
                so: range.so,
                ecID: e.id,
                eo: range.eo,
            });
        }
    }
    /**
     * Set the range in the editor and make sure to focus the editor.
     *
     * @param {Object} range
     */
    async setRange (range) {
        var sc = this.dependencies.Renderer.getElement(range.scID);
        var ec = range.ecID ? this.dependencies.Renderer.getElement(range.ecID) : sc;
        await this.setRangeFromDOM(sc, range.so, ec, range.eo);
    }
    /**
     * Set the range in the editor and make sure to focus the editor.
     *
     * @param {Object} range
     */
    async setRangeFromDOM (sc, so, ec, eo) {
        var el = sc.tagName ? sc : sc.parentNode;
        so = so || 0;
        ec = ec || sc;
        eo = eo == null ? so : eo;
        await this.triggerNativeEvents(sc, ['mousedown']);
        this._selectRange(sc, so, ec, eo);
        el = ec.tagName ? ec : ec.parentNode;
        await this.triggerNativeEvents(el, ['focus', 'mouseup', 'click']);
    }
    /**
     * Set the editor's value.
     *
     * @param {string} value
     */
    async setValue (value, archNodeId) {
        if (this.isDestroyed()) {
            return;
        }
        var Arch = this.dependencies.Arch;
        var container;

        if (archNodeId) {
            container = Arch.getClonedArchNode(archNodeId);
        } else {
            var containers = Arch.findAll('isRoot');
            Arch.bypassUpdateConstraints(function () {
                Arch.bypassChangeTrigger(function () {
                    containers.forEach(function (a, index) {
                        if (index === 0 && a.nodeName === 'test-container') {
                            a.empty();
                            container = a;
                        } else {
                            Arch.remove(a.id);
                        }
                    });
                });

                if (container) {
                    return;
                }

                var root = Arch.getClonedArchNode(1, true);
                container = new we3.TestContainerNode(root.params, 'test-container');
                Arch.bypassUpdateConstraints(function () {
                    Arch.bypassChangeTrigger(function () {
                        if (root.childNodes.length) {
                            Arch.insertBefore(container, root.childNodes[0].id);
                        } else {
                            Arch.insert(container, root.id, 0);
                        }
                    });
                });
            });
        }

        Arch.setValue(value, container.id);

        var start = Arch.getClonedArchNode(1).nextUntil(function (a) { return a.type === 'TEST'; });
        var end = start ? start.nextUntil(function (a) { return a.type === 'TEST'; }, {doCrossUnbreakables: true}) : null;

        var archNode = Arch.getClonedArchNode(container.id, true);

        Arch.setValue(value.replace(regex.range, ''), container.id);
        this._parentedParent._each('setEditorValue', null, ['BaseArch']);

        var range;
        if (!start) {
            range = {
                scID: 1,
                so: 0,
                ecID: 1,
                eo: 0,
            };
        } else {
            var archNode = Arch.getClonedArchNode(1);
            function __getPoint(o, isEnd) {
                var offset = 0;
                var path = o.path();

                // Correct path and offset for insertion of range symbol
                var prev = o.previousSibling();
                if (prev && prev.isText()) {
                    // account for splitting of text node to insert range symbol
                    var prevPrev = prev && prev.previousSibling();
                    if (!prev.isTestNode) {
                        path[path.length - 1]--;
                        offset += prev.length();
                    } else if (prev.isTestNode && prev.isTestNode() && prevPrev && prevPrev.isText()) {
                        path[path.length - 1]--;
                        offset += prevPrev.length();
                    }
                    var prevPrevPrev = prevPrev && prevPrev.previousSibling();
                    if (prevPrev && prevPrev.isTestNode && prevPrevPrev && prevPrevPrev.isText()) {
                        offset += prevPrevPrev.length();
                    }
                }
                // account for splitting of text node to insert start range symbol,
                // and for range symbol itself
                if (isEnd) {
                    var i = 0;
                    o.ancestor(function (a) {
                        i++;
                        if (!a.parent || a.parent.id !== start.parent.id) {
                            return;
                        }
                        path[path.length - i]--;
                        var startPrev = start.previousSibling();
                        var startNext = start.nextSibling();
                        if (startPrev && startPrev.isText() && startNext && startNext.isText() && startNext.id !== o.id) {
                            path[path.length - i]--;
                        }
                        return true;
                    })
                }

                var arch = archNode.applyPath(path.slice());
                if (!arch) {
                    offset = path[path.length - 1];
                    arch = archNode.applyPath(path.slice(0, -1));
                }
                /* var next = arch && arch.nextSibling();
                if (arch && arch.isVirtual() && next) {
                    arch = next.firstLeaf();
                    offset = 0;
                } */
                return {
                    node: arch,
                    offset: offset,
                };
            }
            var s = __getPoint(start, false);
            var e = __getPoint(end, true);

            range = {
                scID: s.node.id,
                so: s.offset,
                ecID: e.node.id,
                eo: e.offset,
            };
        }

        var archNode = this.dependencies.Arch.getClonedArchNode(range.scID);
        if (archNode.parent.childNodes.length === 1 && archNode.parent.id === range.ecID) {
            // eg: <p>▶<img/>◀</p> => select whole P
            range = { scID: archNode.parent.id };
        }
        await this.setRange(range);
    }
    /**
     * Test autoinstall.
     *
     * @param {Object} assert
     * @returns {Promise}
     */
    async test (assert) {
        var test = false;
        this._plugins.forEach(function (plugin) {
            if (plugin.pluginName === 'TestAutoInstall') {
                test = true;
            }
        });
        assert.ok(test, 'Should find "TestAutoInstall" plugin');
        return Promise.resolve();
    }
    /**
     * Trigger events natively on the specified target.
     *
     * @param {node} el
     * @param {string []} events
     * @param {object} [options]
     * @returns {Promise <Event []>}
     */
    async triggerNativeEvents (el, events, options) {
        var self = this;

        if (!el) {
            console.warn('Try to trigger an event on an undefined node');
            return;
        }

        el = el.tagName ? el : el.parentNode;

        if (!el.parentNode) {
            console.warn('Try to trigger an event on a node out of the DOM');
            return;
        }

        options = _.defaults(options || {}, {
            view: window,
            bubbles: true,
            cancelable: true,
        });
        var isMulti = true;
        if (typeof events === 'string') {
            isMulti = false;
            events = [events];
        }
        var triggeredEvents = []
        for (var k = 0; k < events.length; k++) {
            var eventName = events[k];
            var type = _eventType(eventName);
            var ev;
            switch (type) {
                case 'mouse':
                    ev = new MouseEvent(eventName, options);
                    break;
                case 'keyboard':
                    if (options.key && options.key.length > 1) {
                        options.key = _eventKeyName(options.key);
                    }
                    ev = new KeyboardEvent(eventName, options);
                    break;
                case 'composition':
                    ev = new CompositionEvent(eventName, options);
                    break;
                case 'input':
                    ev = new (window.InputEvent || window.CustomEvent)(eventName, options);
                    break;
                default:
                    ev = new Event(eventName, options);
                    break;
            }

            if (!self.options.test || !self.options.test.assert) {
                var onerror = window.onerror
                window.onerror = function (e) {
                    window.onerror = onerror;
                    console.error(e);
                    self.assert.notOk(e, 'ERROR Event: ' + eventName);
                }
            }

            el.dispatchEvent(ev);
            if (options.afterEvent) {
                options.afterEvent(ev);
            }

            if (eventName === 'keypress') {
                await this._afterTriggerNativeKeyPressEvents(el, options);
            }

            if (!self.options.test || !self.options.test.assert) {
                window.onerror = onerror;
            }
            triggeredEvents.push(ev);

            if (type !== 'keyboard' && type !== 'composition' && type !== 'input' && !options.noTimeout) {
                await new Promise(setTimeout);
            }
        };

        // await new Promise(setTimeout); // TODO: remove this false timeout => change other tests (link who use a modal...)

        return isMulti ? triggeredEvents : triggeredEvents[0];
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    async _afterTriggerNativeKeyPressEvents (target, keyPress) {
        if (keyPress.key.length === 1) {
            if (!keyPress.noTextInput) {
                await this._textInput(target, keyPress.key);
            }
            return;
        }
        if (keyPress.key === 'Delete' && document.queryCommandSupported('forwardDelete')) {
            document.execCommand("forwardDelete", true);
            return;
        }
        if (keyPress.key === 'Backspace' && document.queryCommandSupported('delete')) {
            document.execCommand("delete", true);
            return;
        }
        if (keyPress.key === 'Enter') {
            if (keyPress.shiftKey) {
                if (document.queryCommandSupported('insertHTML')) {
                    document.execCommand("insertHTML", false, '<br>');
                    return;
                }
            } else if (keyPress.altKey) {
                if (document.queryCommandSupported('insertHTML')) {
                    document.execCommand("insertHTML", false, '<hr>');
                    return;
                }
            } else if (document.queryCommandSupported('insertBrOnReturn')) {
                document.execCommand("insertBrOnReturn", true);
                return;
            } else {
                var range = this.dependencies.Range.getRange();
                if (range.isCollapsed() || document.queryCommandSupported('delete')) {
                    if (!range.isCollapsed()) {
                        document.execCommand("delete", true);
                    }
                    var nextRangeNode;
                    var node = range.sc;
                    var offset = range.so;
                    while (node !== this.editable && node.tagName !== "TEST-CONTAINER" && node.parentNode) {
                        var n = node.cloneNode(false);
                        if (node.tagName) {
                            [].slice.call(node.childNodes).forEach(function (child, index) {
                                if (index < offset) {
                                    n.appendChild(child);
                                }
                            });
                            if (n.tagName !== 'BR' && n.innerHTML === '') {
                                n.innerHTML = '<br/>';
                            }
                        } else {
                            n.nodeValue = node.nodeValue.slice(0, offset);
                            node.nodeValue = node.nodeValue.slice(offset);
                        }

                        nextRangeNode = nextRangeNode || node;
                        node.parentNode.insertBefore(n, node);

                        if (node.tagName && window.getComputedStyle(node).display === 'block') {
                            break;
                        }

                        offset = [].indexOf.call(node.parentNode.childNodes, node);
                        node = node.parentNode;
                    }

                    if (nextRangeNode) {
                        this._selectRange(nextRangeNode, 0, nextRangeNode, 0);
                    }
                    return;
                }
            }
        }


        var range = this.dependencies.Range.dependencies.BaseRange.getRangeFromDOM();
        var isCollapsed = range.sc === range.ec && range.so === range.eo;
        var range;
        if (keyPress.key === 'ArrowLeft' || keyPress.key === 'ArrowRight') {
            if (range.sc.tagName && range.sc.childNodes[range.so]) {
                range.sc = range.sc.childNodes[range.so];
                range.so = 0;
            }
            if (range.ec.tagName && range.ec.childNodes[range.eo]) {
                range.ec = range.ec.childNodes[range.eo];
                range.eo = 0;
            }
        }

        if (keyPress.key === 'ArrowLeft') {
            if (keyPress.ctrlKey || keyPress.altKey) {
                var specialKeys = (keyPress.ctrlKey ? 'CTRL + ' : '') + (keyPress.altKey ? 'ALT + ' : '');
                console.debug('"' + specialKeys + keyPress.key + '" is not supported in test');
            } else if (keyPress.shiftKey) {
                if (range.ltr && !isCollapsed) {
                    if (range.eo >= 1) {
                        this._selectRange(range.sc, range.so, range.ec, range.eo - 1);
                    } else if (range.ec.previousSibling) {
                        var prev = range.ec.previousSibling;
                        var offset = !prev.tagName ? (prev.length ? prev.length - 1 : 0) : prev.childNodes.length;
                        this._selectRange(range.sc, range.so, prev, offset);
                    } else {
                        console.debug('Native "' + keyPress.key + '" is not exactly supported in test');
                    }
                } else {
                    if (range.so >= 1) {
                        this._selectRange(range.sc, range.so - 1, range.ec, range.eo, true);
                    } else if (range.sc.previousSibling) {
                        var prev = range.sc.previousSibling;
                        var offset;
                        if (!prev.tagName) {
                            offset = prev.length;
                        } else if (prev.childNodes.length) {
                            offset = prev.childNodes.length;
                        } else if (prev.previousSibling && !prev.previousSibling.tagName) {
                            prev = prev.previousSibling;
                            offset = prev.length;
                        } else {
                            offset = [].indexOf.call(prev.parentNode.childNodes, prev);
                            if (offset) {
                                prev = prev.parentNode;
                            }
                        }
                        this._selectRange(prev, offset, range.ec, range.eo, true);
                    } else {
                        console.debug('Native "' + keyPress.key + '" is not exactly supported in test');
                    }
                }
            } else {
                if (!isCollapsed) {
                    var prev = range.sc.previousSibling;
                    if (range.sc.tagName && prev && !prev.tagName) {
                        range.sc = prev;
                        range.so = prev.length;
                    }
                    this._selectRange(range.sc, range.so);
                } else if (range.so > 1) {
                    this._selectRange(range.sc, range.so - 1);
                } else if (range.sc.previousSibling) {
                    var prev = range.sc.previousSibling;
                    var offset = !prev.tagName ? prev.length : prev.childNodes.length;
                    this._selectRange(prev, offset);
                } else {
                    console.debug('Native "' + keyPress.key + '" is not exactly supported in test');
                }
            }
            return;
        }

        if (keyPress.key === 'ArrowRight') {
            if (keyPress.ctrlKey || keyPress.altKey) {
                var specialKeys = (keyPress.ctrlKey ? 'CTRL + ' : '') + (keyPress.altKey ? 'ALT + ' : '');
                console.debug('"' + specialKeys + keyPress.key + '" is not supported in test');
            } else if (keyPress.shiftKey) {
                if (range.ltr || isCollapsed) {
                    if (('length' in range.ec) && range.eo < range.ec.length) {
                        this._selectRange(range.sc, range.so, range.ec, range.eo + 1);
                    } else if (!('length' in range.ec) && range.eo < range.ec.childNodes.length) {
                        if (range.ec.childNodes[range.eo] && !range.ec.childNodes[range.eo].tagName) {
                            range.ec = range.ec.childNodes[range.eo];
                            range.eo = 0;
                        }
                        this._selectRange(range.sc, range.so, range.ec, range.eo + 1);
                    } else if (range.ec.nextSibling) {
                        var next = range.ec.nextSibling;
                        var offset = !next.tagName && next.length ? 1 : 0;
                        this._selectRange(range.sc, range.so, next, offset);
                    } else {
                        console.debug('Native "' + keyPress.key + '" is not exactly supported in test');
                    }
                } else {
                    if (range.so < ('length' in range.sc ? range.sc.length : range.sc.childNodes.length)) {
                        this._selectRange(range.sc, range.so + 1, range.ec, range.eo, true);
                    } else if (range.sc.nextSibling) {
                        var next = range.sc.nextSibling;
                        var offset = !next.tagName && next.length ? 1 : 0;
                        this._selectRange(next, offset, range.ec, range.eo, true);
                    } else {
                        console.debug('Native "' + keyPress.key + '" is not exactly supported in test');
                    }
                }
            } else {
                console.log();
                if (!isCollapsed) {
                    var next = range.ec.nextSibling;
                    if (range.ec.tagName && next && !next.tagName) {
                        range.ec = next;
                        range.so = 0;
                    }
                    this._selectRange(range.ec, range.eo);
                } else if (range.so < ('length' in range.sc ? range.sc.length : range.sc.childNodes.length)) {
                    this._selectRange(range.sc, range.so + 1);
                } else if (range.sc.nextSibling) {
                    var next = range.sc.nextSibling;
                    var offset = !next.tagName && next.length ? 1 : 0;
                    this._selectRange(next, offset);
                } else {
                    console.debug('Native "' + keyPress.key + '" is not exactly supported in test');
                }
            }
            return;
        }
        console.warn('Native "' + keyPress.key + '" is not supported in test');
    }
    /**
     * clean the value for testing, display space, virtual...
     *
     * @private
     * @param {archNodeId|null} json
     * @returns {archNodeId}
     */
    _cleanValue (value) {
        return value
            .replace(regex.space, '&nbsp;')
            .replace(regex.invisible, '&#65279;');
    }
    /**
     * Exec a test's value test.
     *
     * @private
     * @param {Object} assert
     * @param {Object} test
     * @returns {Boolean}
     */
    _execAssert (assert, test) {
        var ok = false;
        if (test.test) {
            var value = this.getValue();
            if (assert.strictEqual(this._cleanValue(value), this._cleanValue(test.test), test.name)) {
                ok = true;
            }
        }
        var value = this.getDomValue();
        if (test.testDOM) {
            if (assert.strictEqual(value, this._cleanValue(test.testDOM), test.name + ' (DOM)')) {
                ok = true;
            }
        } else if (test.test) {
            var testDOM = this._cleanValue(test.test.replace(regex.range, ''));
            if (assert.strictEqual(value, testDOM, test.name + ' (DOM)')) {
                ok = true;
            }
        }
        return ok;
    }
    /**
     * Return the test container id
     *
     * @private
     * @param {archNodeId|null} json
     * @returns {archNodeId}
     */
    _getTestContainer (archNodeId) {
        if (!archNodeId) {
            var containers = [];
            this.dependencies.Arch.getClonedArchNode(1).nextUntil(function (a) {
                if (a.id !== -1 && a.isRoot()) {
                    containers.push(a);
                }
            });
            if (containers.length !== 1) {
                throw new Error("Multiple test containers found");
            }
            archNodeId = containers[0].id;
        }
        return archNodeId;
    }
    /**
     * Return true if the node being tested is virtual.
     *
     * @private
     * @param {JSON} json
     * @returns {Boolean}
     */
    _isTestingVirtualNode(json) {
        return regex.range.test(json.nodeValue);
    }
    /**
     * Load a test.
     *
     * @private
     * @param {Plugin} plugin
     * @returns {Promise}
     */
    async _loadTest (plugin) {
        if (this.isDestroyed()) {
            return;
        }
        if (typeof plugin === 'string') {
            plugin = this._plugins.find(function (p) {
                return p.pluginName === plugin;
            });
        }

        this._testPluginActive = plugin;
        this.assert.ok(true, '<' + plugin.pluginName + '>');

        this.nTests = 0;
        this.nOKTests = 0;

        try {
            await Promise.all([plugin.test(this.assert)]);
        } catch (e) {
            console.debug(e.stack);
            this.assert.notOk(e, 'ERROR');
        }
        this._logFinalResult();
    }
    /**
     * Load all tests.
     *
     * @private
     */
    async _loadTests (resetValue) {
        for (var k = 0; k < this._plugins.length; k++) {
            await this._loadTest(this._plugins[k]);
            this.triggerUp('set_value', {value: resetValue});
        }
        return this._terminate();
    }
    /**
     * Log the final result of a series of tests.
     *
     * @private
     */
    _logFinalResult () {
        var nTests = this.nTests;
        var nOKTests = this.nOKTests;
        var buttonList;
        var button;
        if (this.buttons.elements) {
            buttonList = this.buttons.elements[0];
            button = buttonList.querySelector('we3-button[data-value="' + this._testPluginActive.pluginName + '"]');
        }

        if (nTests - nOKTests === 0) {
            var css = 'background-color: green; color: white;';
            console.info('%cAll ' + nTests + ' tests OK.', css);

            if (button) {
                button.style.backgroundColor = '#ccffcc';
                button.style.color = '#333333';
                button.classList.add('good');
                button.classList.remove('fail');
                button.lastChild.innerHTML = '(' + nTests + ')';
            }
        } else {
            console.warn('Result: ' + nOKTests + '/' + nTests + ' passed. ' + (nTests - nOKTests) + ' to go.');

            if (button) {
                button.style.backgroundColor = '#ffcccc';
                button.style.color = '#333333';
                button.classList.remove('good');
                button.classList.add('fail');
                button.lastChild.innerHTML = '(' + nOKTests + '/' + nTests + ')';
            }
        }

        if (button) {
            var total = buttonList.lastElementChild.children.length - 1;
            var good = buttonList.lastElementChild.querySelectorAll('.good').length;
            var fail = buttonList.lastElementChild.querySelectorAll('.fail').length;
            buttonList.firstElementChild.style.backgroundColor = fail ? '#ffcccc' : '#ccffcc';
            buttonList.firstElementChild.style.color = '#333333';
            buttonList.firstElementChild.textContent = 'Test (' + good + '/' + total + ')';
        }
    }
    /**
     * Execute an individual test.
     *
     * @private
     * @param {Object} assert
     * @param {Object} test
     * @returns {Promise|Boolean}
     */
    async _pollTest (assert, test) {
        await this.setValue(test.content);
        if (test.do) {
            await test.do(assert, test.name);
        }
        return this._execAssert(assert, test);
    }
    /**
     * Select the given collapsed range in the DOM.
     *
     * @private
     * @param {Node} sc
     * @param {offset} so
     * @param {Node} [ec]
     * @param {offset} [eo]
     * @param {boolean} [rtl]
     */
    _selectRange (sc, so, ec, eo, rtl) {
        ec = ec || sc;
        eo = eo == null ? so : eo;
        var nativeRange = sc.ownerDocument.createRange();
        nativeRange.setStart(sc, so);
        nativeRange.setEnd(ec, eo);
        var selection = sc.ownerDocument.getSelection();
        if (selection.rangeCount > 0) {
            selection.removeAllRanges();
        }
        if (rtl) {
            // select in the rtl direction
            nativeRange.setStart(ec, eo);
            nativeRange.setEnd(ec, eo);
            selection.removeAllRanges();
            selection.addRange(nativeRange);
            selection = sc.ownerDocument.getSelection();
            selection.extend(sc, so);
        }
        selection.addRange(nativeRange);
    }
    /**
     * Terminate testing.
     *
     * @private
     */
    _terminate () {
        this._complete = true;
        if (this.options.test && this.options.test.callback) {
            this.options.test.callback(this._results);
        }
    }
    /**
     * Trigger a `textInput` event on `target`.
     *
     * @private
     * @param {Node} target
     * @param {string} char
     */
    async _textInput (target, char) {
        var ev = new (window.InputEvent || window.CustomEvent)('input', {
            bubbles: true,
            cancelBubble: false,
            cancelable: true,
            composed: true,
            data: char,
            defaultPrevented: false,
            detail: 0,
            eventPhase: 3,
            isTrusted: true,
            returnValue: true,
            sourceCapabilities: null,
            inputType: "textInput",
            which: 0,
        });
        target.dispatchEvent(ev);

        if (!ev.defaultPrevented) {
            document.execCommand("insertText", 0, ev.data);
        }
    }
}

we3.addPlugin('Test', TestManagerPlugin);

})();