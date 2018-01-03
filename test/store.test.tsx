import { expect } from 'chai';
import { oneLine } from 'common-tags';
import * as React from 'react';

import * as Record from '../src';

describe('Store', function () {
  it(
    `adds a component to the 'componentGroups' on 'componentDidMount'`
  );
  it(
    `removes a component from the 'componentGroups' on 'componentWillUnmount'`
  );
  it(
    `sets the correct initial state for a component considering the 'currentState'`
  );
  it(
    `applies the 'initialComponentState' connection option when present`,
  );
  it(
    `sends an update when 'setStore' is called on a component`,
  );
  it(
    `sends an update when 'setGlobalStore' is called on a component`
  );
  it(
    oneLine`
      updates only the respective components when the 'select' component option has been configured
    `,
  );
  it(
    `updates the 'selection' in the map of componentGroups`
  );
  it(
    oneLine`
      should have the correct typings for: Store, Selection, StateFromStore, Props,
      StateFromComponent
    `,
    function () {
      class SomeRecord extends Record.define({
        foo: '',
        bar: 0,
      }) { }

      const store = Record.createStore(new SomeRecord());

      class SomeComponent extends store.connect({
        get: store => ({
          foo: store.foo,
          bar: store.bar,
        }),
        set: (store, value) => (store
          .set('foo', value.foo)
          .set('bar', value.bar)
        ),
        initialState: {
          someState: '',
          someStateObject: {
            one: '',
            two: 0,
            three: {
              superNested: 3,
              superNestedObject: new Date(),
            }
          }
        },
        propTypes: types => ({
          someStringProp: types.string,
          someObject: types.shape(types => ({
            nestedProp: types.string,
          })).isOptional,
        }),
      }) {
        render() {
          this.props.someStringProp;
          this.state.someStateObject.three.superNestedObject.getDate();
          this.state.someState;
          this.state.foo;
          this.state.bar;
          return <div></div>
        }
      }

      const element = <SomeComponent someStringProp="" someObject={undefined} />

      class SomeOtherComponent extends store.connect({
        get: store => ({
          foor: store.foo,
          bar: store.bar,
        }),
        set: (store, value) => (store
          .set('foo', value.foo)
          .set('bar', value.bar)
        ),
        propExample: {
          someString: '',
          someObject: {
            someNestedString: '',
          },
        },
      }) {
        render() {

          const shouldBeAString = this.props.someObject.someNestedString;
          const shouldAlsoBeAString = this.props.someString;

          return <div></div>;
        }
      }
    },
  );
});