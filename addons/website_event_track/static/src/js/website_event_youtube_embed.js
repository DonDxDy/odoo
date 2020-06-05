odoo.define('website_event_track.website_event_youtube_embed', function (require) {
'use strict';

var publicWidget = require('web.public.widget');
var utils = require('web.utils');

/**
 * Modal responsible for showing the Youtube live stream / video.
 * It also contains:
 * - The Youtube chat if the video is currently live streaming.
 * - The other live and upcoming tracks as suggestions for the viewer.
 */
publicWidget.registry.websiteEventYoutubeModal = publicWidget.Widget.extend({
    template: 'event_youtube_embed_modal',
    xmlDependencies: ['/website_event_track/static/src/xml/event_youtube_embed_templates.xml'],
    events: {'click .o_wevent_room_side_panel_toggle': '_onToggleSidePanelClick'},

    /**
     * Will query other live and upcoming tracks for the modal rendering.
     */
    willStart: function () {
        var self = this;
        var superPromise = this._super.apply(this, arguments);

        var liveTracksPromise = this._rpc({
            route: `/event/${this.eventId}/track/${this.trackId}/live_tracks`,
        }).then(function (result) {
            self.liveTracks = result;
            return Promise.resolve();
        });

        var upcomingTracksPromise = this._rpc({
            route: `/event/${this.eventId}/track/${this.trackId}/upcoming_tracks`,
        }).then(function (result) {
            self.upcomingTracks = result;
            return Promise.resolve();
        });

        return Promise.all([superPromise, liveTracksPromise, upcomingTracksPromise]);
    },

    /**
     * Setup all necessary options for the rendering.
     *
     * @param {Widget} parent
     * @param {Object} options
     */
    init: function (parent, options) {
        this._super.apply(this, arguments);

        this.eventId = options.eventId;
        this.trackId = options.trackId;
        this.trackName = options.trackName;
        this.youtubeId = options.youtubeId;
        this.speakerId = options.speakerId;
        this.speakerName = options.speakerName;
        this.viewers = options.viewers;
        this.isLiveOrUpcoming = options.isLiveOrUpcoming;

        if (this.youtubeId) {
            this.videoUrl = `https://www.youtube.com/embed/${this.youtubeId}?autoplay=1`;
            this.chatUrl = `https://www.youtube.com/live_chat?v=${this.youtubeId}&amp;embed_domain=${window.location.hostname}`;
        }

        this.formatNumber = utils.human_number;
    },

    /**
     * Show the modal on screen as soon the rendering is done.
     */
    start: function () {
        var self = this;
        this._super.apply(this, arguments).then(function () {
            self.$el.modal('show');
            self.$el.on('hidden.bs.modal', function () {
                self.destroy();
            });
            return Promise.resolve();
        });
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Shows/Hides the side panel to make more room for the video.
     */
    _onToggleSidePanelClick: function () {
        this.$('.o_wevent_youtube_side_panel').toggleClass('d-none');
        this.$('.o_wevent_youtube_side_panel_restore').toggleClass('d-none');
    },
});

publicWidget.registry.websiteEventYoutubeButton = publicWidget.Widget.extend({
    selector: '.o_wevent_youtube_button',

    /**
     * If the URL contains 'open_video', open the modal right away.
     */
    start: function () {
        var self = this;
        this._super.apply(this, arguments).then(function () {
            self.$el.on('click', self._onYoutubeClick.bind(self));
            if (window.location.href.indexOf("open_video") !== -1) {
                self._onYoutubeClick();
            }
            return Promise.resolve();
        });
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Configure the Youtube modal with the track's information.
     */
    _onYoutubeClick: function () {
        new publicWidget.registry.websiteEventYoutubeModal(this, {
            eventId: this.$el.data('eventId'),
            trackId: this.$el.data('trackId'),
            trackName: this.$el.data('trackName'),
            youtubeId: this.$el.data('youtubeId'),
            speakerId: this.$el.data('speakerId'),
            speakerName: this.$el.data('speakerName'),
            viewers: this.$el.data('viewers'),
            isLiveOrUpcoming: this.$el.data('isLiveOrUpcoming'),
        }).appendTo($('body'));
    }
});

return {
    websiteEventYoutubeModal: publicWidget.registry.websiteEventYoutubeModal,
    websiteEventYoutubeButton: publicWidget.registry.websiteEventYoutubeButton
};

});
