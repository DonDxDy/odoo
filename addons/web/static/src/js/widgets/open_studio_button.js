odoo.define('web.open_studio_button', function (require) {
    "use strict";
    
    var Widget = require('web.Widget');
    var core = require('web.core');

    var _lt = core._lt;
    
    var OpenStudioButton = Widget.extend({
        tagName: 'button',
        className: 'btn btn-default dropdown-item d-none d-md-block',
        icon: "fa-plus",
        state_open: false,
        studio_name: 'web_studio',
        events: {
            'click': '_onButtonClick',
        },
        init: function(parent){
            this._super(parent);
        },
        /**
         * @override
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function(){
                var $i = $('<i>').addClass("fa fa-fw o_button_icon")
                                .addClass(self.icon);
                var $span = $('<span>').text(_lt('Add Custom Field'));
                self.$el.append($i).append($span);
            });
        },    
        /**
         * @override
         * @private
         */
        _onButtonClick: function (event) {
            event.stopPropagation();
            if(odoo._modules.indexOf(this.studio_name) === -1){
                $(".test").remove();
                if(!this.state_open){
                    var $div = $('<div>').addClass("test");
                    new SystrayItemStudio(this).appendTo($div);

                    this.$el.after($div);
                }
                this.state_open = !this.state_open;
            } else {
                this.trigger_up('studio_icon_clicked');
            }
        }
    });

    var SystrayItemStudio = Widget.extend({
        events: { 
            'click a.open_install_web_studio': '_onRedirectStudio' 
        },
        template: 'web.install_web_studio', 
        sequence: 1,
        studio_name: 'web_studio',
        init: function(parent){
            this._super(parent);
        },
        _onRedirectStudio: function (ev) {
            ev.preventDefault();
            debugger;
            var self = this;
            this._rpc({
                model: 'ir.module.module',
                method: 'search_read',
                fields: ['id'],
                domain: [['name', '=', self.studio_name]],
            }).then(function (ids){
                self.do_action({
                    type: 'ir.actions.act_window',
                    res_model: 'ir.module.module',
                    views: [[false, 'form']], 
                    res_id: ids[0].id 
                });
            });
        },
    });
    
    return OpenStudioButton;

});
