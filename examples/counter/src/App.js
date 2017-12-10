import React, { Component } from 'react';
import './App.css';
import * as Record from 'recordize';

class CounterRecord extends Record.define({
  count: 0,
}) { }

const store = Record.createStore(new CounterRecord());

const countConnector = {
  get: store => ({
    count: store.count,
  }),
  set: (store, { count }) => store.set('count', count)
};

class IncrementButton extends store.connect(countConnector) {
  handleClick = () => {
    this.setStore(previousState => ({
      ...previousState,
      count: previousState.count + 1,
    }))
  }
  render() {
    return <button onClick={this.handleClick}>+</button>;
  }
}

class DecrementButton extends store.connect(countConnector) {
  handleClick = () => {
    this.setStore(previousState => ({
      ...previousState,
      count: previousState.count - 1,
    }))
  }
  render() {
    return <button onClick={this.handleClick}>-</button>;
  }
}

class Counter extends store.connect(countConnector) {
  render() {
    return <div className="counter">
      <DecrementButton />
      <div>{this.state.count}</div>
      <IncrementButton />
    </div>
  }
}

class StateStream extends store.connect({
  get: store => { },
  set: store => store,
}) {

  constructor() {
    super();
    this.state = {
      updates: [],
    }
  }

  componentDidMount() {
    this.stateStream.scan((updates, nextUpdate) => {
      updates.push(JSON.stringify(nextUpdate.toJS()));
      return updates;
    }, []).subscribe(updates => {
      this.setState(previousState => ({
        ...previousState,
        updates,
      }));
    });
  }

  render() {
    return <div className="state-stream">
      <h2>State updates</h2>
      <pre className="state-stream__states">
        {this.state.updates.map((update, i) => <div key={i}>{update}</div>)}
      </pre>
    </div>;
  }
}


class App extends Component {
  render() {
    return (
      <div className="app">
        <h1>Counter example</h1>
        <div className="counters-container">
          <Counter />
          <Counter />
        </div>
        <StateStream />
      </div>
    );
  }
}

export default App;
