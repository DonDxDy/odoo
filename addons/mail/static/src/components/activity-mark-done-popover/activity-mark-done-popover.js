odoo.define('mail/static/src/components/activity-mark-done-popover/activity-mark-done-popover.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component } = owl;
const { useRef } = owl.hooks;

class ActivityMarkDonePopover extends usingModels(Component) {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this._feedbackTextareaRef = useRef('feedbackTextarea');
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    mounted() {
        this._feedbackTextareaRef.el.focus();
    }

    /**
     * @returns {string}
     */
    get DONE_AND_SCHEDULE_NEXT() {
        return this.env._t("Done & Schedule Next");
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _close() {
        this.trigger('o-popover-close');
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onClickDiscard() {
        this._close();
    }

    /**
     * @private
     */
    _onClickDone() {
        this.env.invoke('Activity/markAsDone',
            this.activity,
            {
                feedback: this._feedbackTextareaRef.el.value,
            }
        );
    }

    /**
     * @private
     */
    _onClickDoneAndScheduleNext() {
        this.env.invoke('Activity/markAsDoneAndScheduleNext',
            this.activity,
            {
                feedback: this._feedbackTextareaRef.el.value,
            }
        );
    }

    /**
     * @private
     */
    _onKeydown(ev) {
        if (ev.key === 'Escape') {
            this._close();
        }
    }

}

Object.assign(ActivityMarkDonePopover, {
    props: {
        activity: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Activity') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.ActivityMarkDonePopover',
});

return ActivityMarkDonePopover;

});
