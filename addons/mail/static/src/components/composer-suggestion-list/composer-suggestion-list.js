odoo.define('mail/static/src/components/composer-suggestion-list/composer-suggestion-list.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;

class ComposerSuggestionList extends usingModels(Component) {}

Object.assign(ComposerSuggestionList, {
    defaultProps: {
        isBelow: false,
    },
    props: {
        composer: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Composer') {
                    return false;
                }
                return true;
            },
        },
        isBelow: Boolean,
    },
    template: 'mail.ComposerSuggestionList',
});

QWeb.registerComponent('ComposerSuggestionList', ComposerSuggestionList);

return ComposerSuggestionList;

});
