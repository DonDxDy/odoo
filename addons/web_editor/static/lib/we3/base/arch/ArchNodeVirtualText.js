(function () {
'use strict';

we3.ArchNodeVirtualText = class extends we3.ArchNodeText {
    static parse (archNode, options) {
        if (archNode.isText() && archNode.nodeValue && archNode.nodeValue.indexOf('\uFEFF') !== -1) {
            var fragment = new we3.ArchNodeFragment(archNode.params);
            archNode.nodeValue.split('\uFEFF').forEach(function (text, i) {
                if (i) {
                    fragment.childNodes.push(new we3.ArchNodeVirtualText(archNode.params));
                }
                if (text.length) {
                    fragment.childNodes.push(new we3.ArchNodeText(archNode.params, null, null, text));
                }
            });
            return fragment;
        }
    }

    constructor () {
        super(...arguments);
        this.nodeValue = '\uFEFF';
    }
    get type () {
        return 'TEXT-VIRTUAL';
    }

    //--------------------------------------------------------------------------
    // Public: export
    //--------------------------------------------------------------------------

    /**
     * @override
     */
    toJSON (options) {
        if (!options || !options.keepVirtual) {
            return null;
        }
        return super.toJSON(options);
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @override
     */
    insert (node) {
        var prev = this.previousSibling();
        if (this.parent.isEmpty() && node.isBR()) {
            var parent = this.parent;
            var index = this.index();
            this.applyRules();
            parent.insert(node, index);
            return;
        }
        if (prev && prev.isText()) {
            prev.insert(node, prev.length());
        } else {
            this.parent.insert(node, this.index());
        }
        this.remove();
    }
    /**
     * @override
     */
    isBlankNode () {
        return true;
    }
    /**
     * @override
     */
    isBlankText () {
        return true;
    }
    /**
     * @override
     */
    isEmpty () {
        return true;
    }
    /**
     * @override
     */
    isVirtual () {
        return true;
    }
    /**
     * @override
     */
    isVisibleText () {
        return false;
    }
    /**
     * @override
     */
    length () {
        return 0;
    }
    /**
     * @override
     */
    split () {
        return false;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @override
     */
    _applyRulesArchNode () {
        var self = this;
        if (this.parent && (this.parent.isList() || this.parent.isRoot())) {
            return this._mutation('br');
        }

        // <p>text<br/>[VIRTUAL]</p> => mutate virtual into <br/> to persist it
        var prev = this.previousSibling();
        if (prev && prev.isBR() && this.isRightEdgeOfBlock()) {
            return this._mutation('br');
        }

        var flowBlock = this.ancestor('isFlowBlock');
        if (!flowBlock) {
            return this.remove();
        }

        if (flowBlock.isDeepEmpty()) {
            if (flowBlock.id === this.parent.id) {
                var siblings = flowBlock.childNodes.filter(function (n) {
                    return n.isVirtual() && n.id !== self.id;
                });
                siblings.slice().forEach(n => n.remove());
            }
            return this._mutation('br');
        }
    }
    /**
     * Mutate the VirtualText from VirtualText to `nodeName`.
     *
     * @param {string} nodeName
     */
    _mutation (nodeName) {
        var archNode = this.params.create(nodeName);
        archNode.id = this.id;
        this.before(archNode);
        this.remove();
    }
};

})();
