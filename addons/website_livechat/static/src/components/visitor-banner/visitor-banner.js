odoo.define('website_livechat/static/src/components/visitor-banner/visitor-banner.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component } = owl;

class VisitorBanner extends usingModels(Component) {}

Object.assign(VisitorBanner, {
    props: {
        visitor: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Visitor') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'website_livechat.VisitorBanner',
});

return VisitorBanner;

});
