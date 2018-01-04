process.env.TS_NODE_TYPE_CHECK = 'true';
import { expect } from 'chai';
import { oneLine } from 'common-tags';
import * as React from 'react';
import * as Record from '../src';

describe('Store', function () {
  it(`adds a component to the 'componentGroups' on 'componentDidMount'`);
  it(`removes a component from the 'componentGroups' on 'componentWillUnmount'`);
  it(`sets the correct initial state for a component considering the 'currentState'`);
  it(`applies the 'initialComponentState' connection option when present`);
  it(`sends an update when 'setStore' is called on a component`, );
  it(`sends an update when 'setGlobalStore' is called on a component`);
  it(`updates only the respective components considering 'select'`);
  it(`updates the 'selection' in the map of componentGroups`);
  it(`defines the correct mapped types when using 'propTypes'`, function () {
    class FooRecord extends Record.define({
      foo: '',
      bar: 0,
    }) { }

    const store = Record.createStore(new FooRecord());

    class Component extends store.connect({
      get: store => ({}),
      set: store => store,
      propTypes: types => ({
        someAny: types.any,
      })
    }) {
      render() {
        const shouldBeAny = this.props.someAny;
        const mustByAny: any = shouldBeAny;
        return <div></div>;
      }
    }
  });
  it(`defines the correct type when using 'propExample'`);
  it(`defines the correct type when using 'initialState'`);
  it(`has the correct types for 'Store', 'Selection', and 'StateFromStore'`);
});