---
layout: post
section-type: post
title: 'Composing React'
category: Rust
tags: [ '' ]
---

Desk has tons of React in it, but how do you go from static to a fully composed React application?

Desk is a Ruby application, built on top of an existing professional services applicaiton, written in Access but backed
by SQL.  This app tracks customers, assets, and service incidents.  The web version makes it easy to quickly view
contact info or configuration.

React allows for a quick page load and inserting the rows of data asynchronously.  Designed as a Ruby on Rails
application, react is easily incorporated into the Rails 6 `webpacker` pipeline using the 
[`react-rails`](https://github.com/reactjs/react-rails) gem.  Simply add the gem to the Gemfile and run the following

```bash
bundle install
rails webpacker:install
rails webpacker:install:react
rails generate react:install
```

As the instructions in the [README](https://github.com/reactjs/react-rails#get-started-with-webpacker) indicate,
creating jsx/js files within app/javascript/components can be loaded using `<%= react_component('pack_name', props) %>`
helper.

Rails makes compiling the packs integrated into the `rails s` process that serves the pages, so changes to the source
files will trigger an in-render compilation of the web pack.  New imports can be loaded using `yarn`.  The first package
I pulled into this project was my favorite layout, bootstrap.

[`React Bootstrap`](https://react-bootstrap.github.io/) makes composing Bootstrap objects within a react component
easy.  `yarn add react-bootstrap bootstrap`

```javascript
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

render() {
  return 
    <Row>
     <Col>first</Col>
     <Col>second</Col>
    </Row>
}
```