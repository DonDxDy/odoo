odoo.define('l10n_co_pos.PaymentScreen', function(require) {
    'use strict';

    const PaymentScreen = require('point_of_sale.PaymentScreen');
    const Registry = require('point_of_sale.ComponentsRegistry');
    const session = require('web.session');

    const L10nCoPosPaymentScreen = PaymentScreen =>
        class extends PaymentScreen {
            async _postPushOrderResolve(order, order_server_ids) {
                try {
                    if (this.env.pos.is_colombian_country()) {
                        const result = await this.rpc({
                            model: 'pos.order',
                            method: 'search_read',
                            domain: [['id', 'in', order_server_ids]],
                            fields: ['name'],
                            context: session.user_context,
                        });
                        order.set_l10n_co_dian(result[0].name || false);
                    }
                } finally {
                    return super._postPushOrderResolve(...arguments);
                }
            }
        };

    Registry.extend(PaymentScreen, L10nCoPosPaymentScreen);

    return PaymentScreen;
});
