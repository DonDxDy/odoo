odoo.define('mail/static/src/component-mixins/using-models/using-models.js', function (require) {
'use strict';

const useModels = require('mail/static/src/component-hooks/use-models/use-models.js');

function usingModels(Component) {
    const ComponentUsingModels = class extends Component {
        /**
         * @override
         */
        constructor(...args) {
            super(...args);
            // this.props.x => this.x
            for (const propName in this.props) {
                Object.defineProperty(this, propName, {
                    configurable: true,
                    get:() => this.props[propName],
                });
            }
            useModels();
        }
        /**
         * @override
         */
        async willUpdateProps(nextProps) {
            for (const propName in nextProps) {
                Object.defineProperty(this, propName, {
                    configurable: true,
                    get:() => this.props[propName],
                });
            }
            return super.willUpdateProps(nextProps);
        }
    };
    return ComponentUsingModels;
}

return usingModels;

});
