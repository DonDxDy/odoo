odoo.define('point_of_sale.ProductScreen', function(require) {
    'use strict';

    const { PosComponent } = require('point_of_sale.PosComponent');
    const { Chrome } = require('point_of_sale.Chrome');
    const { NumberBuffer } = require('point_of_sale.NumberBuffer');
    const { useListener } = require('web.custom_hooks');
    const Registry = require('point_of_sale.ComponentsRegistry');

    class ProductScreen extends PosComponent {
        static template = 'ProductScreen';
        constructor() {
            super(...arguments);
            useListener('update-selected-orderline', this._updateSelectedOrderline);
            useListener('new-orderline-selected', this._newOrderlineSelected);
            useListener('set-numpad-mode', this._setNumpadMode);
            NumberBuffer.use({
                nonKeyboardInputEvent: 'numpad-click-input',
                triggerAtInput: 'update-selected-orderline',
                useWithBarcode: true,
            });
            this.numpadMode = 'quantity';
        }
        mounted() {
            this.env.pos.on('change:selectedOrder', this._onChangeSelectedOrder, this);

            this.env.pos.barcode_reader.set_action_callback({
                product: this._barcodeProductAction.bind(this),
                weight: this._barcodeProductAction.bind(this),
                price: this._barcodeProductAction.bind(this),
                client: this._barcodeClientAction.bind(this),
                discount: this._barcodeDiscountAction.bind(this),
                error: this._barcodeErrorAction.bind(this),
            });
        }
        willUnmount() {
            this.env.pos.off('change:selectedOrder', null, this);
            if (this.env.pos.barcode_reader) {
                this.env.pos.barcode_reader.reset_action_callbacks();
            }
        }
        get currentOrder() {
            return this.env.pos.get_order();
        }
        get controlButtons() {
            return this.constructor.controlButtons.filter(cb => {
                return cb.condition.bind(this)();
            });
        }
        async clickProduct(event) {
            if (!this.currentOrder) {
                this.env.pos.add_new_order();
            }
            const product = event.detail;
            let draftPackLotLines, weight, packLotLinesToEdit;

            // Gather lot information if required.
            if (['serial', 'lot'].includes(product.tracking)) {
                const isAllowOnlyOneLot = product.isAllowOnlyOneLot();
                if (isAllowOnlyOneLot) {
                    packLotLinesToEdit = [];
                } else {
                    const orderline = this.currentOrder
                        .get_orderlines()
                        .filter(line => !line.get_discount())
                        .find(line => line.product.id === product.id);
                    if (orderline) {
                        packLotLinesToEdit = orderline.getPackLotLinesToEdit();
                    } else {
                        packLotLinesToEdit = [];
                    }
                }
                const { confirmed, payload } = await this.showPopup('EditListPopup', {
                    title: this.env._t('Lot/Serial Number(s) Required'),
                    isSingleItem: isAllowOnlyOneLot,
                    array: packLotLinesToEdit,
                });
                if (confirmed) {
                    // Segregate the old and new packlot lines
                    const modifiedPackLotLines = Object.fromEntries(
                        payload.newArray.filter(item => item.id).map(item => [item.id, item.text])
                    );
                    const newPackLotLines = payload.newArray
                        .filter(item => !item.id)
                        .map(item => ({ lot_name: item.text }));

                    draftPackLotLines = { modifiedPackLotLines, newPackLotLines };
                } else {
                    // We don't proceed on adding product.
                    return;
                }
            }

            // Take the weight if necessary.
            if (product.to_weight && this.env.pos.config.iface_electronic_scale) {
                // Show the ScaleScreen to weigh the product.
                const { confirmed, payload } = await this.showTempScreen('ScaleScreen', {
                    product,
                });
                if (confirmed) {
                    weight = payload.weight;
                } else {
                    // do not add the product;
                    return;
                }
            }

            // Add the product after having the extra information.
            this.currentOrder.add_product(product, {
                draftPackLotLines,
                quantity: weight,
            });

            NumberBuffer.reset();
        }
        async _setNumpadMode(event) {
            const { mode } = event.detail;
            this.numpadMode = mode;
            NumberBuffer.reset();
        }
        async _updateSelectedOrderline(event) {
            let { buffer } = event.detail;
            let val = buffer === null ? 'remove' : buffer;
            this._setValue(val);
        }
        async _newOrderlineSelected() {
            NumberBuffer.reset();
        }
        _setValue(val) {
            if (this.currentOrder.get_selected_orderline()) {
                if (this.numpadMode === 'quantity') {
                    this.currentOrder.get_selected_orderline().set_quantity(val);
                } else if (this.numpadMode === 'discount') {
                    this.currentOrder.get_selected_orderline().set_discount(val);
                } else if (this.numpadMode === 'price') {
                    var selected_orderline = this.currentOrder.get_selected_orderline();
                    selected_orderline.price_manually_set = true;
                    selected_orderline.set_unit_price(val);
                }
                if (this.env.pos.config.iface_customer_facing_display) {
                    this.env.pos.send_current_order_to_customer_facing_display();
                }
            }
        }
        _barcodeProductAction(code) {
            // NOTE: scan_product call has side effect in pos if it returned true.
            if (!this.env.pos.scan_product(code)) {
                this._barcodeErrorAction(code);
            }
        }
        _barcodeClientAction(code) {
            const partner = this.env.pos.db.get_partner_by_barcode(code.code);
            if (partner) {
                if (this.currentOrder.get_client() !== partner) {
                    this.currentOrder.set_client(partner);
                    this.currentOrder.set_pricelist(
                        _.findWhere(this.env.pos.pricelists, {
                            id: partner.property_product_pricelist[0],
                        }) || this.env.pos.default_pricelist
                    );
                }
                return true;
            }
            this._barcodeErrorAction(code);
            return false;
        }
        _barcodeDiscountAction(code) {
            var last_orderline = this.currentOrder.get_last_orderline();
            if (last_orderline) {
                last_orderline.set_discount(code.value);
            }
        }
        // TODO jcb: The following two methods should be in PosScreenComponent?
        // Why? Because once we start declaring barcode actions in different
        // screens, these methods will also be declared over and over.
        _barcodeErrorAction(code) {
            this.showPopup('ErrorBarcodePopup', { code: this._codeRepr(code) });
        }
        _codeRepr(code) {
            if (code.code.length > 32) {
                return code.code.substring(0, 29) + '...';
            } else {
                return code.code;
            }
        }
        async _onChangeSelectedOrder(pos, newSelectedOrder) {
            if (newSelectedOrder) {
                await this.render();
            }
        }
    }
    ProductScreen.controlButtons = [];

    /**
     * @param {Object} controlButton
     * @param {Component} controlButton.component
     * @param {Function} controlButton.condition zero argument function that is bound
     *      to the instance of ProductScreen, such that `this.env.pos` can be used
     *      inside the function.
     * @param {Array} [controlButton.position] array of two elements
     *      [locator, relativeTo]
     *      locator: string -> any of ('before', 'after', 'replace')
     *      relativeTo: string -> other controlButtons component name
     */
    ProductScreen.addControlButton = function(controlButton) {
        // We set the name first.
        if (!controlButton.name) {
            controlButton.name = controlButton.component.name;
        }

        // If no position is set, we just push it to the array.
        if (!controlButton.position) {
            this.controlButtons.push(controlButton);
        } else {
            // Find where to put the new controlButton.
            const [locator, relativeTo] = controlButton.position;
            let whereIndex = -1;
            for (let i = 0; i < this.controlButtons.length; i++) {
                if (this.controlButtons[i].name === relativeTo) {
                    if (['before', 'replace'].includes(locator)) {
                        whereIndex = i;
                    } else if (locator === 'after') {
                        whereIndex = i + 1;
                    }
                    break;
                }
            }

            // If found where to put, then perform the necessary mutation of
            // the buttons array.
            // Else, we just push this controlButton to the array.
            if (whereIndex > -1) {
                this.controlButtons.splice(
                    whereIndex,
                    locator === 'replace' ? 1 : 0,
                    controlButton
                );
            } else {
                let warningMessage =
                    `'${controlButton.name}' has invalid 'position' ([${locator}, ${relativeTo}]).` +
                    'It is pushed to the controlButtons stack instead.';
                console.warn(warningMessage);
                this.controlButtons.push(controlButton);
            }
        }

        // We then add to the components object.
        this.addComponents([controlButton.component]);
    };

    Chrome.addComponents([ProductScreen]);
    Registry.add('ProductScreen', ProductScreen);

    return { ProductScreen };
});
