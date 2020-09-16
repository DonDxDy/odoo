odoo.define('mail/static/src/components/chatter-topbar/chatter-topbar.js', function (require) {
'use strict';

const usingModels = require('mail/static/src/component-mixins/using-models/using-models.js');

const { Component, QWeb } = owl;

class ChatterTopbar extends usingModels(Component) {

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickAttachments(ev) {
        this.env.invoke('Record/update', this.chatter, {
            $$$isAttachmentBoxVisible: !this.chatter.$$$isAttachmentBoxVisible(this),
        });
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickClose(ev) {
        this.trigger('o-close-chatter');
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickLogNote(ev) {
        if (!this.chatter.$$$composer(this)) {
            return;
        }
        if (
            this.chatter.$$$isComposerVisible(this) &&
            this.chatter.$$$composer(this).$$$isLog(this)
        ) {
            this.env.invoke('Record/update', this.chatter, {
                $$$isComposerVisible: false,
            });
        } else {
            this.env.invoke('Chatter/showLogNote',
                this.chatter
            );
        }
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickScheduleActivity(ev) {
        const action = {
            type: 'ir.actions.act_window',
            name: this.env._t("Schedule Activity"),
            res_model: 'mail.activity',
            view_mode: 'form',
            views: [[false, 'form']],
            target: 'new',
            context: {
                default_res_id: this.chatter.$$$thread(this).$$$id(this),
                default_res_model: this.chatter.$$$thread(this).$$$model(this),
            },
            res_id: false,
        };
        return this.env.bus.trigger('do-action', {
            action,
            options: {
                on_close: () => {
                    this.env.invoke('Rthread/refreshActivities',
                        this.chatter.$$$thread(this)
                    );
                    this.env.invoke('Rhread/refresh',
                        this.chatter.$$$thread(this)
                    );
                },
            },
        });
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickSendMessage(ev) {
        if (!this.chatter.$$$composer(this)) {
            return;
        }
        if (
            this.chatter.$$$isComposerVisible(this) &&
            !this.chatter.$$$composer(this).$$$isLog(this)
        ) {
            this.env.invoke('Record/update', this.chatter, {
                $$$isComposerVisible: false,
            });
        } else {
            this.env.invoke('Chatter/showSendMessage',
                this.chatter
            );
        }
    }

}

Object.assign(ChatterTopbar, {
    props: {
        chatter: {
            type: Object,
            validate(p) {
                if (p.constructor.modelName !== 'Chatter') {
                    return false;
                }
                return true;
            },
        },
    },
    template: 'mail.ChatterTopbar',
});

QWeb.registerComponent('ChatterTopbar', ChatterTopbar);

return ChatterTopbar;

});
