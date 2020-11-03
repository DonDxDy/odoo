odoo.define('l10n_de_pos_cert.ProductScreen', function(require) {
    "use strict";

    const ProductScreen = require('point_of_sale.ProductScreen');
    const Registries = require('point_of_sale.Registries');
    const { TaxError } = require('l10n_de_pos_cert.exceptions');

    const _super_productscreen = ProductScreen.prototype;

    const PosDeProductScreen = ProductScreen => class extends ProductScreen {
        async _clickProduct(event) {
            _super_productscreen._clickProduct.apply(this,arguments).catch(async (error) => {
                if (error instanceof TaxError) {
                    const title = this.env._t('Tax error');
                    const body = this.env._t(
                        'Product has an invalid tax amount. Only standard (16% or 19%), reduced (5% or 7%) and zero (0%) rates are allowed.'
                    );
                    await this.showPopup('ErrorPopup', { title, body });
                } else {
                    return Promise.reject(error);
                }
            });
        }
    }

    Registries.Component.extend(ProductScreen, PosDeProductScreen);

    return PosDeProductScreen;
});

