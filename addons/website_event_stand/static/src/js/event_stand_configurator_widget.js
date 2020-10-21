odoo.define('website_event_stand.product_configurator', function (require) {
var ProductConfiguratorWidget = require('sale.product_configurator');

ProductConfiguratorWidget.include({

    _isConfigurableLine: function () {
        return this.recordData.is_event_stand || this._super.apply(this, arguments);
    },

    _onEditLineConfiguration: function () {
        if (this.recordData.is_event_stand) {
            var defaultValues = {
                default_product_id: this.recordData.product_id.data.id,
                default_sale_order_line_id: this.recordData.id || null
            };
            if (this.recordData.event_id) {
                defaultValues.default_event_id = this.recordData.event_id.data.id;
            }
            if (this.recordData.event_stand_id) {
                defaultValues.default_event_stand_id = this.recordData.event_stand_id.data.id;
            }
            if (this.recordData.event_stand_slot_ids) {
                defaultValues.default_event_stand_slot_ids = this.recordData.event_stand_slot_ids.res_ids;
            }
            this._openEventStandConfigurator(defaultValues, this.dataPointID);
        } else {
            this._super.apply(this, arguments);
        }
    },

    _onProductChange: function (productId, dataPointId) {
        var self = this;
        return this._super.apply(this, arguments).then(function (stopPropagation) {
            if (stopPropagation) {
                return Promise.resolve(true);
            } else {
                return self._checkForEventStand(productId, dataPointId);
            }
        });
    },

    _checkForEventStand: function (productId, dataPointId) {
        var self = this;
        return this._rpc({
            model: 'product.product',
            method: 'read',
            args: [productId, ['is_event_stand']],
        }).then(function (result) {
            if (result && result[0].is_event_stand) {
                self._openEventStandConfigurator({
                    default_product_id: productId
                }, dataPointId);
                return Promise.resolve(true);
            }
            return Promise.resolve(false);
        });
    },

    _openEventStandConfigurator: function (data, dataPointId) {
        var self = this;
        this.do_action('website_event_stand.event_stand_configurator_action', {
            additional_context: data,
            on_close: function (result) {
                if (result && !result.special) {
                    self.trigger_up('field_changed', {
                        dataPointID: dataPointId,
                        changes: result.eventStandConfiguration,
                        onSuccess: function () {
                            self._onLineConfigured();
                        }
                    });
                } else {
                    if (!self.recordData.event_id || !self.recordData.event_stand_id) {
                        self.trigger_up('field_changed', {
                            dataPointID: dataPointId,
                            changes: {
                                product_id: false,
                                name: ''
                            },
                        });
                    }
                }
            }
        });
    },
});

return ProductConfiguratorWidget;

});
