(function($){

  Drupal.ajax.prototype.commands.removeClickDisableClass = function(ajax, response, status) {
    $('.custom-editable').removeClass('click-disabled');
    $('.inline-edit-button').fadeIn(100);
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
    }
    catch (err) {
      alert('An error occurred while attempting to process ' + ajax.options.url);
      return false;
    }

    $('#edit-submit').removeClass('ajax-processed');

  };

  Drupal.behaviors.inline_editor = {
    attach: function (context, settings) {

      var $fields = $('.content').find('.field');

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
            $(this).closest('.field-collection-container').addClass('custom-editable ' + fieldName);
          }
          else if (!$(this).find('.field-items').hasClass('inline-editor-cke')) {
            if (!$(this).hasClass('custom-editable')) {
              var target = $('.inline-edit-button.active').attr('target-element');
              $(this).addClass(target);
              $('.inline-edit-button').removeClass('active');
            }
            $(this).addClass('custom-editable');
          }

        });
      }
    }
  };


  $(document).ready(function() {

    // Define a custom ajax action not associated with an element.
    var custom_settings = {};
    custom_settings.url = Drupal.settings.basePath + 'inline-editor/get-ajax-form/';
    custom_settings.event = 'onload';
    custom_settings.keypress = false;
    custom_settings.prevent = false;
    custom_settings.effect = 'fade';
    Drupal.ajax['custom_ajax_action'] = new Drupal.ajax('custom_ajax_action', $(document.body), custom_settings);

    var editButton = '<div class="inline-edit-button">Edit</div>',
        inlineTargetElement = 1;

    if (typeof Drupal.settings.ckeFields != 'undefined') {
      if (Drupal.settings.ckeditorExists) {

        $.each(Drupal.settings.ckeFields, function(field,type){

          var fieldName = field.replace(/_/g, '-');

          $('.field-name-' + fieldName + ' .field-items').attr('id', 'cke-edit-id-' + fieldName);
          $('#cke-edit-id-' + fieldName).addClass('inline-editor-cke')
                                        .attr({
                                          'contenteditable': 'true',
                                          'cke-data-id' : Drupal.settings.id,
                                          'cke-data-fieldname' : field,
                                          'cke-data-entity-type' : Drupal.settings.entityType,
                                          'cke-data-field-type' : type.field,
                                          'cke-data-text-preocessing' : type.text_processing
                                        }).parent().removeClass('custom-editable');
        });

        // Make title editable
        if($('#page-title').length) {
          $('#page-title').addClass('inline-editor-cke')
                          .attr({
                            'contenteditable': 'true',
                            'cke-data-id' : Drupal.settings.id,
                            'cke-data-fieldname' : 'title',
                            'cke-data-entity-type' : Drupal.settings.entityType,
                            'cke-data-field-type' : 'text',
                            'cke-data-text-preocessing' : 0
                          })
                          .addClass('inline-target-' + inlineTargetElement)
                          .before($(editButton).attr('target-element', 'inline-target-' + inlineTargetElement));

        }
      }
    }

    $('.inline-editor-cke').each(function(index) {

      inlineTargetElement++;

      // Add edit button
      $(this).addClass('inline-target-' + inlineTargetElement)
             .parent('.field').before($(editButton).attr('target-element', 'inline-target-' + inlineTargetElement));

      if (typeof CKEDITOR != 'undefined') {
        var content_id = $(this).attr('id'),
            $content_id = $('#' + content_id),
            innerHTML = $($content_id.html()).html() ?
                          $($content_id.html()).html() :
                          $content_id.html(),
            prevValue = innerHTML.trim();

        $(this).attr('cke-data-prev-value', prevValue);

        textProcessing = $(this).attr('cke-data-text-preocessing');

        CKEDITOR.inline(content_id, {
          on: {
            blur: function(event) {
              $('.inline-edit-button').fadeIn(100).removeClass('active');
              var output = {},
                  fieldElement = $('#' + content_id),
                  textProcessing = fieldElement.attr('cke-data-text-preocessing') == 1 ? true : false;
                  prevValue = fieldElement.attr('cke-data-prev-value').trim();

              output['data'] = event.editor.getData().trim();

              if (!textProcessing) {

                // Get only text without tags
                output['data'] = stripTags(output['data']);
                prevValue = stripTags(prevValue);

              }

              if (output['data'] != prevValue) {
                fieldElement.attr('cke-data-prev-value', output['data'].trim());

                output['fieldName'] = fieldElement.attr('cke-data-fieldname'),
                output['id'] = fieldElement.attr('cke-data-id'),
                output['entityType'] = fieldElement.attr('cke-data-entity-type');
                output['fieldType'] = fieldElement.attr('cke-data-field-type');

                $.ajax({
                  url: Drupal.settings.basePath + 'save-cke-inline-data',
                  dataType: 'json',
                  type: "POST",
                  data: {
                      data : output,
                  },
                  success: function(data) {
                    console.log('data: ' + data);
                  },
                  error: function(data) {
                    console.log(data);
                  },
                });
              }

            },
            focus : function(event) {
              $('.inline-edit-button').fadeOut(100);
            }
          },

          toolbar : (
            textProcessing == 1 ?
              [
                ['Source', 'Cut','Copy','Paste','PasteText','PasteFromWord','-','SpellChecker', 'Scayt'],
                ['Undo','Redo','Find','Replace','-','SelectAll','RemoveFormat'],
                ['Flash','Table','HorizontalRule','Smiley','SpecialChar'],
                ['Maximize', 'ShowBlocks'],
                '/',
                ['Format'],
                ['Bold','Italic','Underline','Strike','-','Subscript','Superscript'],
                ['NumberedList','BulletedList','-','Outdent','Indent','Blockquote'],
                ['JustifyLeft','JustifyCenter','JustifyRight','JustifyBlock','-','BidiRtl','BidiLtr'],
                ['Link','Unlink','Anchor','Linkit','LinkToNode','LinkToMenu'],
                ['DrupalBreak', 'DrupalPageBreak']
              ]
              :
              [
                ['Source', 'Cut','Copy','Paste','PasteText','PasteFromWord','-','SpellChecker', 'Scayt'],
                ['Undo','Redo','Find','Replace','-','SelectAll'],
              ]
          ),
        });
      }
    });

    $("body").delegate(".inline-edit-button", "mouseenter", function(){
      var target = '.' + $(this).attr('target-element');
      $(target).addClass('apply-border');
    });

    $("body").delegate(".inline-edit-button", "mouseout", function(){
      var target = '.' + $(this).attr('target-element');
      $(target).removeClass('apply-border');
    });

    $("body").delegate(".inline-edit-button", "click", function(){

      var targetElem = '.' + $(this).attr('target-element');

      if ($(targetElem).hasClass('custom-editable')) {
        inlineEditorLoadForm($(targetElem));
      }
      else {
        $(targetElem).focus();
      }

      $('.inline-edit-button').fadeOut(100);
      $(this).addClass('active');

    });

    $("body").delegate(".form-autocomplete", "keydown", function(e) {
      if (e.which == 13 && $('#autocomplete').length > 0) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });

    // Add edit button
    $('.custom-editable').each(function(){
      inlineTargetElement++;
      $(this).addClass('inline-target-' + inlineTargetElement)
             .before($(editButton).attr('target-element', 'inline-target-' + inlineTargetElement));
    });


    $('body').delegate('.custom-edit-cancel','click' , function(){

      var $parent = $(this).closest('.parent'),
          data = $parent.attr('data');

      $($parent).replaceWith(data);
      $('.custom-editable').removeClass('click-disabled');
      $('.inline-edit-button').fadeIn(100).removeClass('active');

    });

  });

  function stripTags (input, allowed) {
    // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
      commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
      return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
  }

  function inlineEditorLoadForm(field) {
    var entityType = typeof Drupal.settings.entityType != 'undefined' ? Drupal.settings.entityType : '',
      id = typeof Drupal.settings.id != 'undefined' ? Drupal.settings.id : '';


    if ($('.custom-edit-in-use').length) {
      return false;
    }

    $('.inline-edit-button').fadeOut(100);

    var fieldName,
        classes = $(field).attr('class').split(' '),
        thisClicked = field;

    $.each(classes, function(key, classValue) {
      // Search for field name.
      if (classValue.indexOf('field-name-') > -1) {
        // Get field name.
        fieldName = classValue.replace('field-name-', '').replace(/-/g, '_');
        return false;
      }
    });


    var html_container = thisClicked[0].outerHTML;

    $(thisClicked).removeClass('custom-editable')
                  .addClass('parent custom-edit-in-use current-edit custom-editable-' + fieldName)
                  .attr('data', html_container);

    $('.custom-editable').addClass('click-disabled');

    Drupal.ajax['custom_ajax_action'].getForm(fieldName, entityType, id);

    return false;

  }

})(jQuery);
