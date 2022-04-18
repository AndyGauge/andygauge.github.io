---
layout: post
section-type: post
title: 'Stimulus -ification'
category: Rails
tags: [ '' ]
---

At fountin we have an infra tool that uses rails to enable
devs to deploy sha tags from Github to staging
environment.  It used some DOM manipulation to 
convert output of running kubernetes tools (`helm`).

I really wanted to hook up the automated testing
suite that I helped build, but started first
experimenting with changing dependencies.

## Gemfile

```
gem 'rails', github:'rails/rails'
```


Starting off with the ruby and rails versions so
that we track main (see last 2-3 posts about joining
pre-release and be as cool as Github also), we find
the bump to 7 includes [new javascript options](https://medium.com/signal-v-noise/stimulus-1-0-a-modest-javascript-framework-for-the-html-you-already-have-f04307009130).

For context, 7 is general available as of Jan 6, no news about 7.1.0.aplha release
timeline, but Mar 8, 7.0.2.3 is the latest in `7.X`.

#### Stimulus

chat it up with [Hotwire](https://discuss.hotwired.dev)
or [👀 references](https://stimulus.hotwired.dev/reference/controllers)]

This seemed to match our goal of swapping out elements 
with partials stored in our views folder, but with
less boilerplate.  

Coming from react it was nice to see that in the 
`Controller` all by `fetch` javascript can remain 
event oriented and the magic method generation soothed
my rails-centric programming mental model I use.

```javascript
import {Controller} from "@hotwired/stimulus";

export default class extends Controller {
    static targets = ['namespaces', 'selected', 'debug']

    connect() {
        this.fetchCloud();
    }

    fetchCloud() {

    }
}
```
We want the app to initialize by calling some function 
that will grab from the API (which currently resolves to
a javascript `respond_to` block).  To keep things simple,
the controller gets `format.html { render layout: false }` and
a view file ending in `.html.erb` with similar contents
to the `js`:

```erbruby
 render partial: 'dashboard/namespace', locals: { namespace: @namespace } 
```

It isn't a big change for this app, but the code that was
stripped away was brittle jquery:

```erbruby
$("#create-namespace-log").replaceWith("<%= j(render partial: 'dashboard/namespace', locals: { namespace: @namespace } ) %>");
```

Now that the controller responds with the html, we can
use javascript to fetch the partial loaded up with data
asynchronously.  But where is it?  What actually receives
the html partial?

```html
<div data-controller="dashboard">
    <div data-dashboard-target="namespaces" ></div>
</div>
```

Finally we hook it up by 

```javascript
import {fetchNamespaces} from "../util/api";

fetchCloud() {
    fetchNamespaces()
        .then(response => response.text())
        .then(body => this.namespacesTarget.innerHTML = body)
    
    }
}
```
Finally we add [actions](https://stimulus.hotwired.dev/handbook/hello-stimulus#actions-respond-to-dom-events)
with a button in the partial.  These buttons lined
up like tabs on a console.

```erbruby
<% metadata = namespace['metadata'] %>
  <td>
    <button data-action="click->dashboard#select" data-namespace="<%=metadata['name'] %>">
      <%= metadata['name'] %>
    </button>
  </td>
```
And extend our `fetchCloud()`

```javascript
    select(event) {
        event.preventDefault();
        fetchReleases(event.target.getAttribute('data-namespace'))
            .then(response => response.text())
            .then(body => this.selectedTarget.innerHTML = body)
    }
```
This time we are customizing the API call by passing
in the namespace we stored on the rendered partial.

Beneath the tabs, render the output with:
```html
<div class="selectedNamespace" data-dashboard-target="selected"></div>
```

Being a very simple application, stimulus orchestrates a pattern
that is easy to maintain.