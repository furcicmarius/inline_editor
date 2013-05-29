
(function($){

  Drupal.ajax.prototype.commands.removeClickDisableClass = function(ajax, response, status) {
    $('.custom-editable').removeClass('click-disabled');
  }

  Drupal.ajax.prototype.getForm = function(fieldName, entityType, id) {
    var ajax = this;
    ajax.options.url = Drupal.settings.basePath + 'inline-editor/get-ajax-form/' + fieldName + '/' + entityType + '/' + id;
    // Do not perform another ajax command if one is already in progress.
    if (ajax.ajaxing) {
      return false;
    }

    try {
      $.ajax(ajax.options);
      // $('.field-name-' + fieldName.replace('_', '-')).hide(500,function(){$(this).remove();});
    }
    catch (err) {
      alert('An error occurred while attempting to process ' + ajax.options.url);
      return false;
    }

    $('#edit-submit').removeClass('ajax-processed');

    // return false;
  };


  /**
   * Define a custom ajax action not associated with an element.
   */
  var custom_settings = {};
  custom_settings.url = Drupal.settings.basePath + 'inline-editor/get-ajax-form/';
  custom_settings.event = 'onload';
  custom_settings.keypress = false;
  custom_settings.prevent = false;
  custom_settings.effect = 'fade';
  Drupal.ajax['custom_ajax_action'] = new Drupal.ajax('custom_ajax_action', $(document.body), custom_settings);

  Drupal.behaviors.inline_editor = {
    attach: function (context, settings) {

      var $fields = $('#content').find('.content').find('.field');

      if (!$fields.hasClass('current-edit') && typeof Drupal.settings.id != 'undefined') {

        $.each($fields, function(k,v){
          var classes = $(this).attr('class').split(' ');

          $.each(classes, function(key, classValue) {
            // Search for field name.
            if (classValue.indexOf('field-name-') > -1) {
              // Get field name.
              fieldName = classValue;
              return false;
            }
          });

          if ($(this).closest('.field-collection-container').length) {
            // For field collection add a single class
            // console.log($(this));
            $(this).closest('.field-collection-container').addClass('custom-editable ' + fieldName);
          }
          else if (!$(this).find('.field-items').hasClass('inline-editor-cke')) {
            $(this).addClass('custom-editable');
          }

        });
      }
    }
  };

  $(document).ready(function() {

    if (typeof Drupal.settings.ckeFields != 'undefined') {
      $.each(Drupal.settings.ckeFields, function(field,type){

        var fieldName = field.replace(/_/g, '-');

        $('.field-name-' + fieldName + ' .field-items').attr('id', 'cke-edit-id-' + fieldName);
        $('#cke-edit-id-' + fieldName).addClass('inline-editor-cke')
                                      .attr('contenteditable', 'true')
                                      .attr({'cke-data-id' : Drupal.settings.id, 'cke-data-fieldname' : field, 'cke-data-entity-type' : Drupal.settings.entityType, 'cke-data-field-type' : type})
                                      .parent().removeClass('custom-editable');
      });

      // Make title editable
      if($('#page-title').length) {
        $('#page-title').addClass('inline-editor-cke')
                        .attr('contenteditable', 'true')
                        .attr({'cke-data-id' : Drupal.settings.id, 'cke-data-fieldname' : 'title', 'cke-data-entity-type' : Drupal.settings.entityType, 'cke-data-field-type' : 'text'});
      }
    }

    $(".inline-editor-cke").each(function( index ) {
      if (typeof CKEDITOR != 'undefined') {
        var content_id = $(this).attr('id'),
            tpl = $(this).attr('tpl'),
            prevValue = $(this)[0]['innerText'];

        $(this).attr('cke-data-prev-value', prevValue);

        var that = this;

        CKEDITOR.inline( content_id, {
          on: {
            blur: function( event ) {

              var output = {};

              // Get input value
              output['data'] = event.editor.getData();

              // Get only text without tags
              // Appending <p> prevents data loss
              output['data'] = $('<p>'  + output['data'] + '</p>').text();


              if (output['data'].trim() != $(that).attr('cke-data-prev-value').trim()) {

                $(that).attr('cke-data-prev-value', output['data'].trim());

                output['fieldName'] = $(that).attr('cke-data-fieldname'),
                output['id'] = $(that).attr('cke-data-id'),
                output['entityType'] = $(that).attr('cke-data-entity-type');
                output['fieldType'] = $(that).attr('cke-data-field-type');

                $.ajax({
                  url: Drupal.settings.basePath + 'save-cke-inline-data',
                  dataType: 'json',
                  type: "POST",
                  async: true,
                  data: {
                      data : output,
                  },
                  success: function(data) {
                    console.log(data);
                  },
                  error: function(data) {
                    console.log(data);
                  },
                });
              }

            }
          },

          toolbar :[
            ['Source'],
            ['Cut','Copy','Paste','PasteText','PasteFromWord','-','SpellChecker', 'Scayt'],
            ['Undo','Redo','Find','Replace','-','SelectAll','RemoveFormat'],
            [/*'Image',*/'Flash','Table','HorizontalRule','Smiley','SpecialChar'],
            ['Maximize', 'ShowBlocks'],
            '/',
            ['Format'],
            ['Bold','Italic','Underline','Strike','-','Subscript','Superscript'],
            ['NumberedList','BulletedList','-','Outdent','Indent','Blockquote'],
            ['JustifyLeft','JustifyCenter','JustifyRight','JustifyBlock','-','BidiRtl','BidiLtr'],
            ['Link','Unlink','Anchor','Linkit','LinkToNode','LinkToMenu'],
            ['DrupalBreak', 'DrupalPageBreak']
          ],
        });
      }
    });
/*
    var instance = CKEDITOR.instances['page-title'];

    console.log(CKEDITOR.instances);

    if(instance)
    {
        CKEDITOR.remove(instance);
    }

    CKEDITOR.replace('page-title', {
      toolbar : 'Cms'
    });*/

    var entityType = typeof Drupal.settings.entityType != 'undefined' ? Drupal.settings.entityType : '',
        id = typeof Drupal.settings.id != 'undefined' ? Drupal.settings.id : '',
        $content = $('#content').find('.content').find('.field'),
        nid;

/*    $.each($content, function(k,v){
      // console.log(this);

      var classes = $(this).attr('class').split(' ');

      $.each(classes, function(key, classValue) {
        // Search for field name.
        if (classValue.indexOf('field-name-') > -1) {
          // Get field name.
          fieldName = classValue.replace('field-name-', '').replace('-', '_');
          return false;
        }
      });

      // $(this).addClass('custom-editable-' + fieldName);
    });*/

    $('.custom-editable').live('click', function(){

      if ($('.custom-edit-in-use').length) {
        return false;
      }

      var fieldName,
          classes = $(this).attr('class').split(' '),
          thisClicked = this;

      $.each(classes, function(key, classValue) {
        // Search for field name.
        if (classValue.indexOf('field-name-') > -1) {
          // Get field name.
          fieldName = classValue.replace('field-name-', '').replace(/-/g, '_');
          return false;
        }
      });


      var html_container = thisClicked.outerHTML;

      $(thisClicked).removeClass('custom-editable').addClass('parent custom-edit-in-use current-edit custom-editable-' + fieldName).attr('data', html_container);
      // $(thisClicked).remove();
      $('.custom-editable').addClass('click-disabled');

      Drupal.ajax['custom_ajax_action'].getForm(fieldName, entityType, id);

      return false;

/*     if (fieldName) {
       $.ajax({
         type: "POST",
         url: 'get-form',
         dataType: 'text',
         data: {'field_name' : fieldName, 'id' : id, 'type' : entityType},
         success: function (data) {


           Drupal.attachBehaviors($('#field-edit-container').find('.form-item'));

           // Drupal.attachBehaviors($(thisClicked).find('.custom-edit-save'));

           // console.log($element);
           // console.log($.data($element, 'value'));
           // $(thisClicked).hide();
         },
         error: function(error) {
           console.log(error);
         }
       });
       // console.log(fieldName);
     }*/
    });

    $('body').delegate('.custom-edit-cancel','click' , function(){

      var $parent = $(this).closest('.parent'),
          data = $parent.attr('data');

      $($parent).replaceWith(data);
      $('.custom-editable').removeClass('click-disabled');

    });

   /* $('body').delegate('.custom-edit-save', 'click', function(e){
      e.preventDefault();

      var $fields = $('#content').find('.content').find('.field');

      $.each($fields, function(k,v){
        console.log('da');
        $(this).addClass('custom-editable');
      });
      console.log('da');
      $('#custom-edit-get-form').submit();
      return false;
    });*/
    // Aloha.jQuery('.custom-editable').aloha();
    // console.log('da');
  });

  // $(window).load(function(){
  //     var $ = Aloha.jQuery;
  //     $('.custom-edit').aloha();
  // });

})(jQuery);
