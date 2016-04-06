---
layout: post
section-type: post
title: 'Responsive Footer responding to mobile keyboards'
category: praybook
tags: [ 'magic' ]
---

I have a footer on every page that is fixed on the bottom of every page using Twitter Bootstrap.  My primary navigation is on top of the page, but I find a bottom navigation fixed to the bottom easier to use on mobile sites.  [Praybook](http://www.praybook.xyz) is a mobile-centric site, and the top navigation is responsive, so it takes a few extra clicks to get around.  The bottom navigation provides quick links to the major parts of the site.  I've backported some of the v4 support (bg-faded) and the footer looks good:

    <footer class="navbar-fixed-bottom bg-faded">
      <div class="container-fluid">
        <div class="row">
          <div class="col-md-7 col-lg-6 col-md-offset-3 col-lg-offset-4">
            <ul class="nav nav-tabs">
              <li class="nav-item"><a class="nav-link" href="/prayers">Prayers</a></li><li class="nav-item"><a class="nav-link" href="/praises">Praises</a></li><li class="nav-item"><a class="nav-link" href="/friends">Friends</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>

On mobile browsers, this footer gets in the way when the user is entering information into a text field.  The site is HTML5 and I use the semantic names (phone, email).  I wrote a jQuery/CoffeeScript tool for hiding the footer when the user is entering data:

    footer_ready = ->
      input_selector_for_keyboard_events = 'input:not(:radio):not(:checkbox):not(:hidden):not(:submit), textarea, select'
      $(input_selector_for_keyboard_events).on focus: ->
        if $(window).width() < 960
          $('footer').addClass('hidden')
      $(input_selector_for_keyboard_events).on blur: ->
        $('footer.hidden').removeClass('hidden')
    $(document).ready(footer_ready)
    $(document).on('page:change', footer_ready)

The first line of this script is the JavaScript equivalent of `function footer_ready() {` that declares all subsequent lines that have indentation as a function.  The function is used when the page is ready, either for a page load or for a Rails 4 Turbolinks ready.  

The function uses the jQuery selector on `input` and `textarea` elements.  To make the selector specific for the events that are triggering keyboard, the :not slector removes radios, checkboxes, submit buttons, and hidden input elements.   

An event hander is added to each of the selected input objects which checks if the site is (likely) being viewed on a mobile device by using a media-query-like max-width conditional.  If the page is viewed in a small browser window this behavior can be seen (which has helped in testing).  The result of the event is to add a class to the footer element.  If there are multiple footer elements on the page, all of them will be hidden.  An ID selector may be better if you sprinkle footer goodness everywhere.

The blur event is responsible for capturing when the focus is given to any other object, like clicking out of the text area.  Blur is used here to remove the hidden class on any hidden footers.   
