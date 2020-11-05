odoo.define('website_event_track.website_event_track_proposal', function (require) {
    'use strict';

    var core = require('web.core');
    var publicWidget = require('web.public.widget');
    var utils=require('web.utils');

    var _t = core._t;

    publicWidget.registry.websiteEventProposalForm = publicWidget.Widget.extend({

    selector: '.website_event_track_proposal_form',
    events: {
        'input .partner_name_input': '_propagateNameOnContact',
        'click .add_contact_information': '_makeContactInformationRequired',
        'input .at_least_one_required': '_atLeastOneContactFieldRequired'
    },
    
    /**
     * Propagates the speaker name to contact name on new input. 
     * @private
     * @param {Event} ev
     */
    _propagateNameOnContact: function(ev){
        var text = $(ev.currentTarget).val();
        $("input[name='contact_name']").val(text).change();
    },

    /** 
     * When the user selects the contact me through different email / phone option, it becomes 
     * mandatory to enter a contact phone OR a contact email. As long as they are both empty,
     * those fields are made mandatory and a warning message is set visible next to the submit button.
     * Once one of them is filled, fields are no more required and the message disappear.
     * @private
     */
    _atLeastOneContactFieldRequired: function(){
        var contactEmail=this.$(".contact_field_email")[0];
        var contactPhone=this.$(".contact_field_phone")[0];
        var hasContactMean=$('.contact_field_phone').val() || $('.contact_field_email').val();

        console.log("%c"+$('.contact_field_email').val(),"color:orange");

        if(hasContactMean) {
            contactEmail.removeAttribute("required");
            contactPhone.removeAttribute("required");
            $('.require_contact_info_warning').addClass('invisible');
        }
        else{
            contactEmail.setAttribute("required", "True");
            contactPhone.setAttribute("required", "True");
            $('.require_contact_info_warning').removeClass('invisible');
        }
    },

    /**
     * Handler for required fields when enabling/disabling contact information. Contact name is made required.
     * Ensures disabling required fields and warning message when unchecking the contact information section.
     * @private
     * @param {Event} ev
     */
    _makeContactInformationRequired: function(ev){
        var isChecked = $(ev.currentTarget).is(':checked');
        var contactName=this.$(".contact_field_name")[0];
        var contactEmail=this.$(".contact_field_email")[0];
        var contactPhone=this.$(".contact_field_phone")[0];

        if(isChecked){
            contactName.setAttribute("required", "True");
            this._atLeastOneContactFieldRequired();
        }
        else{
            $('.require_contact_info_warning').addClass('invisible');
            contactName.removeAttribute("required");
            contactEmail.removeAttribute("required");
            contactPhone.removeAttribute("required");
            
            // Prevent unnoticed error:
            if (!utils.is_email($('.contact_field_email').val())){
                $('.contact_field_email').val('').change();
            }

        }
    },
})
});
