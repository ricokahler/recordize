process.env.TS_NODE_TYPE_CHECK = 'true';
import { expect } from 'chai';
import { oneLine } from 'common-tags';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { JSDOM } from 'jsdom';

import * as Record from '../src';
import { DeferredPromise } from './util';

const document = (global as any).document || new JSDOM().window.document;

function wait(milliseconds: number) {
  return new Promise(resolve => setTimeout(() => resolve(), milliseconds));
}

describe('Store', function () {
  it(`adds a component to the 'componentGroups' on 'componentDidMount'`, async function () {
    class FooRecord extends Record.define({
      foo: '',
      bar: 0,
    }) { }
    const firstInstance = new FooRecord();
    const store = Record.createStore(firstInstance);
    const mountedComponent = new DeferredPromise();

    class Component extends store.connect({
      get: store => ({}),
      set: store => store,
    }) {
      componentDidMount() {
        super.componentDidMount();
        mountedComponent.resolve();
      }

      render() {
        return <div />;
      }
    }

    const element = document.createElement('div');
    document.body.appendChild(element);
    let componentReference: any;
    ReactDOM.render(<Component ref={ref => componentReference = ref} />, element);

    await mountedComponent;
    expect(store.componentGroups.size).to.be.equal(1);

    const [selection, componentGroup] = Array.from(store.componentGroups.entries())[0];

    expect(selection).to.be.equal(firstInstance);
    expect(componentGroup.components.size).to.be.equal(1);
    expect(componentGroup.components.keys().next().value).to.be.equal(componentReference);
  });

  it(`removes a component from the 'componentGroups' on 'componentWillUnmount'`);

  it(`sets the correct initial state for a component considering the 'currentState'`);

  it(`applies the 'initialComponentState' connection option when present`);

  it(`sends an update when 'setStore' is called on a component`, );

  it(`sends an update when 'setGlobalStore' is called on a component`);

  it(`updates only the respective components considering 'select'`);

  it(`updates the 'selection' in the map of componentGroups`);

  /*
   * Note: theses tesst are solely for typings. The purpose is check to see if the typescript compiler
   * will accept the types without throwing any errors similar to how `DefinitelyTyped` includes
   * tests.
   */

  it(`defines the correct mapped types when using 'propTypes'`, function () {
    class FooRecord extends Record.define({
      foo: '',
      bar: 0,
    }) { }

    const store = Record.createStore(new FooRecord());

    class Thingy { }

    class Component extends store.connect({
      // TODO: possible typescript bug breaks type interface when type of props isn't asserted
      get: (store, props: any) => ({}),
      set: store => store,
      propTypes: types => ({
        someAny: types.any,
        someArray: types.array,
        someArrayOfNumbers: types.arrayOf(types.number),
        someBool: types.bool,
        someFunc: types.func,
        someNumber: types.number,
        someObject: types.object,
        someString: types.string,
        someSymbol: types.symbol,
        someNode: types.node, // TODO: better typings
        someElement: types.element, // TODO: better typings
        someThingy: types.instanceOf(Thingy),
        definedWithShape: types.shape({
          nestedString: types.string,
        }),
        definedWithTypeOf: types.typeOf({
          nestedNumber: 0,
          nestedObject: {
            nestedNestedNumber: 0,
          }
        })
      })
    }) {
      render() {
        const shouldBeAny = this.props.someAny;
        const mustByAny: any = shouldBeAny;

        const shouldBeArray = this.props.someArray;
        const mustByArray: any[] = shouldBeArray;

        const shouldBeArrayOfNumbers = this.props.someArrayOfNumbers;
        const mustBeArrayOfNumbers: number[] = shouldBeArrayOfNumbers;

        const shouldBeBool = this.props.someBool;
        const mustBeBool: boolean = shouldBeBool;

        const shouldBeFunction = this.props.someFunc;
        const mustBeFunction: Function = shouldBeFunction;

        const shouldBeNumber = this.props.someNumber;
        const mustBeNumber: number = shouldBeNumber;

        const shouldBeObject = this.props.someObject;
        const mustBeObject: object = shouldBeObject;

        const shouldBeString = this.props.someString;
        const mustBeString: string = shouldBeString;

        const shouldBeSymbol = this.props.someSymbol;
        const mustBeSymbol: symbol = shouldBeSymbol;

        // TODO: better typings
        const shouldBeNode = this.props.someNode;
        const mustBeNode: any = shouldBeNode;

        // TODO: better typings
        const shouldBeElement = this.props.someElement;
        const mustBeElement: any = shouldBeElement;

        const shouldBeThingy = this.props.someThingy;
        const mustBeThingy: Thingy = shouldBeThingy;

        const definedWithShape = this.props.definedWithShape;
        const shouldBeNestedString = definedWithShape.nestedString;
        const mustBeNestedString: string = shouldBeNestedString;

        const definedWithTypeOf = this.props.definedWithTypeOf;
        const shouldBeNestedNumber = definedWithTypeOf.nestedNumber;
        const mustBeNestedNumber: number = shouldBeNestedNumber;
        const shouldBeNestedNestedNumber = definedWithTypeOf.nestedObject.nestedNestedNumber;
        const mustBeNestedNestedNumber: number = shouldBeNestedNestedNumber;

        return <div></div>;
      }
    }
  });

  it(`defines the correct mapped type when using 'optionalPropTypes'`, function () {
    class FooRecord extends Record.define({
      foo: '',
      bar: 0,
    }) { }

    const store = Record.createStore(new FooRecord());

    class Component extends store.connect({
      propTypes: types => ({
        requireString: types.string,
      }),
      optionalPropTypes: types => ({
        optionalString: types.string,
      }),
      get: (store, props: any) => { // TODO: possible typescript breaks generic inferrence
        return {};
      },
      set: store => store,
    }) {
      render() {
        const shouldBeString = this.props.requireString;
        const mustBeString: string = shouldBeString;

        let stringOrUndefined = this.props.optionalString;
        stringOrUndefined = undefined;

        return <div></div>;
      }
    }

    const leaveOutOptional = <Component requireString="something" />;
  });

  it(`defines the correct type when using 'propExample'`, function () {
    class FooRecord extends Record.define({
      foo: '',
      bar: 0,
    }) { }

    const store = Record.createStore(new FooRecord());

    interface ComponentProps {
      requireString: string,
      optionalString?: string,
    }

    class Component extends store.connect({
      // for some reason, I don't need to assert the type of props here...
      get: (store, props) => ({
        one: '',
        two: ''
      }),
      set: (store, value, props) => store,
      propsExample: {} as ComponentProps,
    }) {
      render() {
        const shouldBeString = this.props.requireString;
        const mustBeString: string = shouldBeString;

        let stringOrUndefined = this.props.optionalString;
        stringOrUndefined = undefined;

        return <div></div>;
      }
    }

    const leaveOutOptional = <Component requireString="something" />;
  });

  it(`infers the correct type of 'StateFromStore`, function () {
    class FooRecord extends Record.define({
      foo: '',
      bar: 0,
    }) { }

    const store = Record.createStore(new FooRecord());

    class Component extends store.connect({
      get: (store) => ({
        fooStateFromStore: store.foo,
        barStateFromStore: store.bar,
      }),
      // TODO: value is of type `any` and it could be more specific
      set: (store, value, props) => (store
        .set('foo', value.fooStateFromStore)
        .set('bar', value.barStateFromStore)
      ),
    }) {
      render() {
        const shouldBeString = this.state.fooStateFromStore;
        const mustBeString: string = shouldBeString;

        const shouldBeNumber = this.state.barStateFromStore;
        const mustBeNumber: number = shouldBeNumber;
        return <div />;
      }
    }
  });

  it(`infers the correct type of 'StateFromStore' when using selector`, function () {
    class NestedRecord extends Record.define({
      nestedProp: '',
    }) { }

    class FooRecord extends Record.define({
      foo: '',
      bar: 0,
      nestedRecord: new NestedRecord(),
    }) { }

    const store = Record.createStore(new FooRecord());

    class Component extends store.connect({
      select: store => store.nestedRecord,
      // TODO: this `nestedRecord` needs to be type asserted for some reason
      deselect: (store, nestedRecord: NestedRecord) => store.set('nestedRecord', nestedRecord),
      get: nestedRecord => ({
        nestedPropFromState: nestedRecord.nestedProp
      }),
      set: (nestedRecord, value) => nestedRecord.set('nestedProp', value.nestedPropFromState),
    }) {
      render() {
        const shouldBeString = this.state.nestedPropFromState;
        const mustBeString: string = shouldBeString;
        return <div />;
      }
    }
  });

  it(`defines the correct type when using 'initialState'`, function () {
    class FooRecord extends Record.define({
      foo: '',
      bar: 0,
    }) { }

    const store = Record.createStore(new FooRecord());

    class Component extends store.connect({
      get: store => ({}),
      set: store => store,
      initialState: {
        someComponentLevelState: false,
        someObject: {
          someNestedState: ''
        }
      }
    }) {
      render() {
        const shouldBeBoolean = this.state.someComponentLevelState;
        const mustBeBoolean: boolean = shouldBeBoolean;

        const shouldBeString = this.state.someObject.someNestedState;
        const mustBeString: string = shouldBeString;

        return <div />;
      }
    }
  });
});