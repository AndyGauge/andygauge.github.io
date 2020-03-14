---
layout: post
section-type: post
title: 'Composing React'
category: React
tags: [ '' ]
---

Desk has tons of React in it, but how do you go from static to a fully composed React application?

Desk is a Ruby application, built on top of an existing professional services application, written in Access but backed
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

The first component for Desk is the Company, which displays all of the people, places, things, and events at a customer.
The view needs to display all of the content, but organize it so it is easy to navigate.  I chose AJAX loading to ensure
fast page loading while supporting large datasets.  I use Bootstrap's accordian to hide these things from view by default.

```javascript
<Card className="card-collapse">
  <Card.Header>
    <Accordion.Toggle as={Button} variant="link" eventKey="0">
      Contacts
    </Accordion.Toggle>
  </Card.Header>
  <Accordion.Collapse eventKey="0">
    <Card.Body>
      {this.loadContactsFromState}
    </Card.Body>
  </Accordion.Collapse>
</Card>
```

We're explicitly not doing anything dynamic yet, `{this.loadContactsFromState}` will be replaced with the contacts, but
acts as a placeholder for the contacts that will be loaded.

React, like Rails, is about convention.  It is more of a philosophy than framework.  The first part of the philosophy,
which has already been alluded is the props.  Props are the parameters passed to the component.

This Component takes a company, loaded from active record, distilled to its values, and passed as props.

```ruby
<%= react_component 'Company', @company %>
```  

As simple as that, now the React component has the attributes of the Company object.  These attributes are made
accessible from the boilerplate seen on most every React component:

```javascript
class Company extends Component {
    constructor(props) {
        super(props);
```

Suddenly, within the `render` method we can access the company's name using `this.props.name` given the rails model
has a `name` attribute.  Immediately after the props are initialized the second React idiom comes into light:

```javascript
        this.state = { contacts: [] };
    }
```

This is the only time we are going to set the state with an equal operator, but in the constructor we want to set the
initial state to something that the rest of our application will handle gracefully.  We will be calling `.map` on
`contacts` so we need to make sure it is always going to respond without an error.

Now that the component responds to being initialized we would like to populate `contacts` state from an api call.  The
api simply renders json contacts scoped to the customer

```ruby
@company = Company.find(props[:id])
render json: @company.contacts
```

So where do we make the API call from within React?  There are lifecycle hooks that are implemented to make
some of them are [here](https://reactjs.org/docs/state-and-lifecycle.html#adding-lifecycle-methods-to-a-class).  

```javascript
    componentDidMount() {
        fetch('https://deskapp.com/company/'+this.props.id+'/contacts')
            .then(response => response.json())
            .then(contacts => this.setState({ contacts }));
    }
```

There's a ton there, but here are the new react parts that we should be comfortable with.  Our `fetch` call assembles a
URL using `this.props.id` which was the `@company`'s `id` attribute passed all the way back in the view.  We perform
some ES6 insanity on the response, distilling the json into an object which is then set to a local variable named contact
so updating the state with `this.setState` could avoid using `{ contacts: contacts }` syntax.  The 
[shorthand](http://es6-features.org/#PropertyShorthand) is explained elsewhere.  

`this.setState` is a critical part of the React mindset.  My biggest hurdle to understanding React was accepting
that the state is not set until React can most efficiently update the entire component.  This means function bodies will
resolve before the state is updated.  Multiple `setState` calls will be performed together, and we cannot rely on the
state's update for the remainder of the current rendering.

Now that our contacts are updated from the AJAX call, let's implement the rendering of the contacts.

```javascript
    loadContactsFromState = () => {
        return (
            <Card.Body>
              <Row>
                <Col>Name</Col>
                <Col>Cell</Col>
                <Col>E-mail</Col>
              </Row>
              { this.state.contacts.map((contact) =>
                  <Row key={'contact' + contact.id}>
                      <Col>{contact.ContactName}</Col>
                      <Col>{contact.CellPhone}</Col>
                      <Col>{contact.Email}</Col>
                  </Row>
              )}
            </Card.Body>            
        )
    }
```

By reducing our contact objects into an html partial, we can easily create dynamic content pulled from
our Rails app, and update it without having to return a javascript function manually manipulating the DOM.

We've seen how to improve load times by pulling in dynamic data using AJAX calls that do not require our
JavaScript to directly manipulate the DOM, and how complex interactivity can be added incrementally.  The component
as it exists today is [on Github](https://github.com/AndyGauge/desk/blob/master/app/javascript/components/Company.js). 

After a while this becomes much easier to reason about than the alternative.

