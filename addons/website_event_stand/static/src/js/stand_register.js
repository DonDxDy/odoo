odoo.define('website_event_stand.stand_slot', function (require) {
'use strict';

var dom = require('web.dom');
var publicWidget = require('web.public.widget');

publicWidget.registry.websiteEventStandSlot = publicWidget.Widget.extend({
    selector: '.o_wevent_stand_registration',
    events: {
        'change input[name="stand_type_id"]': '_onChangeStandType',
        'change select[name="stand_id"]': '_onChangeStand',
    },

    start: function () {
        this.eventId = parseInt(this.$el.data('event-id'));
        return this._super.apply(this, arguments);
    },

    _onChangeStandType: function (ev) {
        ev.preventDefault();
        var self = this;
        var standTypeId = parseInt(ev.currentTarget.value);
        this._rpc({
            model: 'event.stand',
            method: 'search_read',
            domain: [
                ['event_id', '=', this.eventId],
                ['stand_type_id', '=', standTypeId],
                ['state', '=', 'available']
            ]
        }).then(function (result) {
            self._fillStandTypeDescription(standTypeId);
            self._fillStandSelectionInput(result);
        });
    },

    _fillStandTypeDescription: function (standTypeId) {
        var $elemDescription = this.$el.find('.o_wevent_stand_type_description');
        this._rpc({
            model: 'event.stand.type',
            method: 'search_read',
            domain: [['id', '=', standTypeId]],
            limit: 1
        }).then(function (result) {
            $elemDescription.empty();
            $elemDescription.append(result[0].description);
        });
    },

    _fillStandSelectionInput: function (standIds) {
        var $selectionElem = this.$el.find('select[name="stand_id"]');
        $selectionElem.empty();
        $.each(standIds, function (key, stand) {
            $selectionElem.append('<option value="' + stand.id + '">' + stand.name + '</option>');
        });
        $selectionElem.trigger('change');
    },

    _onChangeStand: function (ev) {
        ev.preventDefault();
        var self = this;
        var standId = parseInt(ev.currentTarget.value);
        this._rpc({
            model: 'event.stand.slot',
            method: 'search_read',
            domain: [
                ['event_id', '=', this.eventId],
                ['event_stand_id', '=', standId],
                ['state', '=', 'available']
            ]
        }).then(function (result) {
            self._fillStandSlots(result);
        });
    },

    _fillStandSlots: function (standSlotIds) {
        var $slotsElem = this.$el.find('.o_wevent_stand_slots');
        $slotsElem.empty();
        $.each(standSlotIds, function (key, slot) {
            let $checkbox = dom.renderCheckbox({
                text: slot.display_name,
                prop: {
                    name: 'event_stand_slot_ids',
                    value: slot.id
                }
            });
            $slotsElem.append($checkbox);
        });
    }
});

    return {
        websiteEventStandSlot: publicWidget.registry.websiteEventStandSlot
    };

});
