# Recordize

> a state management library revolving around simplicity amd immutable records

**This library is a big work-in-progress!** There are no released versions yet. Check back soon.

# Motivation

Redux is cool and all but there's a bit too much indirection. At the end of the day, all you want to do is dispatch an update to the global store. Moreover, you might have been told to use immutable data structures with Redux to aid in performance.

Well that's were Recordize comes in. Recodize is an even simpler state management library that does everything Redux can (or is planned to meet the needs of Redux users soon).

# Example

```tsx
import * as Record from 'recordize';

// In order to create the store, you must first create a Record definition
// pass in the default properties for the record extend the class the `define` function returns.
class SomeRecord extends Record.define({
  someProperty: 'some value',
  someOtherProperty: 'some other value',
  count: 0,
  name: 'world',
}) {
  // you can have computed properties too
  get computedProperty() {
    return this.someProperty + this.someOtherProperty;
  }
}

// after you define the record, you can make it the instance of the store
const Store = Record.createStore(new SomeRecord());

interface SomeComponentProps { }
interface SomeComponentState { }

// then you can just create components by "connecting" them
class SomeComponent extends Store.connect({
  // create a mapping between properties and the store
  // these properties will go directly on `this.state`
  count: {
    get: store => store.count,
    set: (store, value) => store.set('count', value),
  }
})<SomeComponentProps, SomeComponentState> {

  get defaultState() {
    return {};
  }

  render() {
    return <div>
      {/* the mapped properties get placed on `this.state` so it's natural to use */}
      <h1>you clicked: {this.state.count} time(s)!</h1>
      <button onClick={() => {
        // this.sendUpdate is analogous to this.setState expect it sends it off to the global store
        this.sendUpdate(previousState => ({
          ...previousState,
          count: previousState.count + 1
        }))
      }}>click here</button>
    </div>
  }
}

interface NameComponentProps { }
interface NameComponentState { }

class NameComponent extends Store.connect({
  name: {
    get: store => store.name,
    set: (store, value) => store.set('name', value)
  }
})<NameComponentProps, NameComponentState> {

  get defaultState() {
    return {};
  }

  render() {
    return <div>
      <h1>Hello, {this.state.name}!</h1>
      <input type="text" defaultValue={this.state.name} onInput={e => {
        this.sendUpdate(previousState => ({
          ...previousState,
          name: e.currentTarget.value
        }));
      }} />
    </div>
  }
}

function App() {
  return <div>
    <NameComponent />
    <NameComponent />
    <SomeComponent />
  </div>
}

// to use the connected component, just place in a react dom. No need for a provider
ReactDOM.render(<App />, document.querySelector('#app'));

// you can also hook into the update stream
Store.stateStream
  .map(store => store.count)
  .distinctUntilChanged()
  .debounceTime(1000)
  .subscribe(newCount => {
    // whenever there is a change to the model,
    // you can send of a network request or whatever you like
    fetch(/*...*/)
  });
```

![screenshot](./screenshot.png)

# Planned features

* serialization/deserialization
* fast JSON merge-patch for efficient network requests
* server side endpoint factory
* calculated property hashing
* "graph" API
* compatibility with Redux middleware

Check back soon for more development news. Drop an issue if you'd like to see a feature or if you want to help out.