odoo.define('website_event_track.website_event_track_proposal_add_tags', function (require) {
    'use strict';

    var core = require('web.core');
    var publicWidget = require('web.public.widget');

    var _t = core._t;

    publicWidget.registry.websiteEventProposalTags = publicWidget.Widget.extend({

    selector: '.proposal_add_tags',

    init: function (parent, options){
        this.tagIds=[];
        // The route used is the same as the one of the track creation page, where we append /tags : 
        // Here explicitly: /event/<model("event.event"):event>/track_proposal
        this.tagRoute=window.location.href + "/tags";
        this._super(parent, options);
    },

    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
            self._bindSelect2Dropdown();
        });
    },

    /**
     * Handler for select2 on tags added to the proposal track form.
     *
     * @private
     */
    _bindSelect2Dropdown: function () {
        var self = this;
        this.$('#add_tags_track_proposal').select2(this._select2Wrapper(_t('Select categories'),
            function () {
                return self._rpc({
                    route: self.tagRoute,
                    params: {
                        fields: ['name','category_id'],
                        domain: [['id','not in',self.tagIds],['color','!=',0]],
                    }
                });           
            })
        );
    },

    /**
     * Wrapper for select2. Load data from server once and store it.
     * Tags are sorted in alphabetical order and take format "tag.category.name : tag.name"
     * Or "tag.name" if tag does not belong to any category.
     * 
     * @private
     * @param {String} Placeholder for element.
     * @param {Function} Function to fetch data from remote location should return a Promise
     * resolved data should be array of object with id and name. eg. [{'id': id, 'name': 'text'}, ...]
     * @param {String} [nameKey='name'] (optional) the name key of the returned record
     *   ('name' if not provided)
     * @returns {Object} select2 wrapper object
    */
   _select2Wrapper: function (tag, fetchFNC, nameKey) {
    nameKey = nameKey || 'name';

    var values = {
        placeholder: tag,
        allowClear: true,
        formatNoMatches: false,
        selection_data: false,
        fetch_rpc_fnc: fetchFNC,
        multiple:'multiple',
        sorter: data => data.sort((a, b) => a.text.localeCompare(b.text)),

        //category_id[1] contains the name of the tag category
        fill_data: function (query, data) {
            var that = this,
                tags = {results: []};
            _.each(data, function (obj) {
                if (that.matcher(query.term, obj[nameKey])) {
                    if(obj.category_id[1]){
                    tags.results.push({id: obj.id, text: obj.category_id[1] + " : " + obj[nameKey]});
                    }
                    else{
                    tags.results.push({id: obj.id, text: obj[nameKey]});    
                    }
                }
            });
            query.callback(tags);
        },

        query: function (query) {
            var that = this;
            // fetch data only once and store it
            if (!this.selection_data) {
                this.fetch_rpc_fnc().then(function (data) {
                    that.fill_data(query, data.read_results);
                    that.selection_data = data.read_results;
                });
            } else {
                this.fill_data(query, this.selection_data);
            }
        }
    };

    return values;

    },

})
});
