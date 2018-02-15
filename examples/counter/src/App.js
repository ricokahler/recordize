import * as React from 'react';
import * as Record from 'recordize';

class CounterRecord extends Record.define({
  count: 0,
}) {
  // add methods to create "actions"
  // these methods uses the method of immutable.js to return an immutable copy of itself
  increment() { return this.update('count', count => count + 1); }
  decrement() { return this.update('count', count => count - 1); }
}

const store = Record.createStore(new CounterRecord());

class App extends store.connect() {
  handlePlusClick = () => {
    // `store.increment()` returns a new store
    this.setStore(store => store.increment());
  }

  handleMinusClick = () => {
    // you can also use the immutable.js methods to mutate the store
    // the only requirement is that you have to return a copy of the store
    this.setStore(store => store.update('count', count => count - 1));
  }

  render() {
    return <div>
      <h1>Count: {this.store.count}</h1>
      <button onClick={this.handleMinusClick}>-</button>
      <button onClick={this.handlePlusClick}>+</button>
    </div>;
  }
}

export default App;
