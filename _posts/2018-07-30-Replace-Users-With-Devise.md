---
layout: post
section-type: post
title: 'Replace Users with Devise'
category: Rails
tags: [ 'authentication' ]
---

I rolled my own authentication for Praybook.  There was a complex
single table inheritance design that enabled someone to try out Praybook
without signing up.  If someone tracked their prayers, and wanted to
save their experience, they could sign up and log in from another device.

Now, I want to include email integration for password reset.  At this
point rolling my own authentication is no longer taking less time than
relying on Devise, the de facto Rails solution to Authentication.

The implementation included a relationship between users through
a join table that relates Users to Persons.  Persons are the pre-member
class that elevates to users.

First, to get `ActiveModel` `has_secure_password` migrated to Devise, the
table must rename `password_digest` to `encrypted_password`.  This will
allow Devise users to log in with existing passwords.

```ruby
class PersonDevisePassword < ActiveRecord::Migration[5.1]
  def change
    remove_column :person, :encrypted_password
    rename_column :person, :password_digest, :encrypted_password
  end
end
```

I had a `LoginsController` that called `authenticate` on a selected user.
Devise uses a `SessionsController` that is paired well with my login action.
I simply replaced `form_for :login` with `form_for :user` and changed the
form's action.  Devise's wiki [gives complete instructions](https://github.com/plataformatec/devise/wiki/How-To:-Display-a-custom-sign_in-form-anywhere-in-your-app)

```ruby
<%= form_for :user,
  { url: session_path(:user),
    layout: :inline,
    html: {class: "navbar-form navbar-right"}} do |login_form| %>
```

My home page relies on the @user variable being populated by the
controller, either a new Person or the currently logged in user.  My
method current_user needs to be removed, and @user assigned to either
Devise `current_user` or a new Person (assigned to the session).

```ruby
    <% if !user_signed_in? && current_page?(root_path)%>  
```

Now the sign in is shown when Devise says the user is logged in.  Not
surprisingly, my Log Out button no longer works.

```ruby
<%= link_to('Logout', destroy_user_session_path, method: :delete, class: "nav-link pb-navbar-link") %>
```

Additionally, we need to configure `ActionMailer`.  I am using gmail for
development so changing `config/environments/development.rb` is sufficient.

```ruby
config.action_mailer.raise_delivery_errors = true
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address: "smtp.gmail.com",
  port: 587,
  domain: ENV["GMAIL_DOMAIN"],
  authentication: "plain",
  enable_starttls_auto: true,
  user_name: ENV["GMAIL_USERNAME"],
  password: ENV["GMAIL_PASSWORD"]
}
```

Even with a complicated User story with roll-your-own authentication,
moving to Devise is an easy process.
