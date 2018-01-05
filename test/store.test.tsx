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
  it(`adds a components to the 'componentGroups' on 'componentDidMount'`, async function () {

    class BranchARecord extends Record.define({
      branchAKey: 'branch a value',
    }) { }

    class BranchBRecord extends Record.define({
      branchBKey: 'branch b value',
    }) { }

    class FooRecord extends Record.define({
      rootKey: 'root value',
      branchA: new BranchARecord(),
      branchB: new BranchBRecord(),
    }) { }

    const firstInstance = new FooRecord();
    const store = Record.createStore(firstInstance);

    const rootComponentMounted = new DeferredPromise();
    const branchAComponentMounted = new DeferredPromise();
    const branchBComponentMounted = new DeferredPromise();
    const secondBranchBComponentMounted = new DeferredPromise();;

    let rootComponentReference: any;
    let branchAComponentReference: any;
    let branchBComponentReference: any;
    let secondBranchBComponentReference: any;

    class ComponentConnectedToRoot extends store.connect({
      get: store => ({
        fromRoot: store.rootKey,
      }),
      set: (store, newValue) => store.set('rootKey', newValue.fromRoot),
    }) {

      componentDidMount() {
        super.componentDidMount();
        rootComponentMounted.resolve();
      }

      render() {
        return <div />;
      }
    }

    class ComponentConnectedToBranchA extends store.connect({
      select: store => store.branchA,
      deselect: (store, branchA: BranchARecord) => store.set('branchA', branchA),
      get: branchA => ({
        fromBranchA: branchA.branchAKey,
      }),
      set: (branchA, value) => branchA.set('branchAKey', value.fromBranchA),
    }) {

      componentDidMount() {
        super.componentDidMount();
        branchAComponentMounted.resolve();
      }

      render() {
        return <div />;
      }
    }

    class ComponentConnectedToBranchB extends store.connect({
      select: store => store.branchB,
      deselect: (store, branchB: BranchBRecord) => store.set('branchB', branchB),
      get: branchB => ({
        fromBranchB: branchB.branchBKey,
      }),
      set: (branchB, value) => branchB.set('branchBKey', value.fromBranchB),
    }) {

      componentDidMount() {
        super.componentDidMount();
        branchBComponentMounted.resolve();
      }

      render() {
        return <div />;
      }
    }

    class ComponentAlsoConnectedToBranchB extends store.connect({
      select: store => store.branchB,
      deselect: (store, branchB: BranchBRecord) => store.set('branchB', branchB),
      get: branchB => ({
        fromBranchB: branchB.branchBKey,
      }),
      set: (branchB, value) => branchB.set('branchBKey', value.fromBranchB),
    }) {

      componentDidMount() {
        super.componentDidMount();
        secondBranchBComponentMounted.resolve();
      }

      render() {
        return <div />;
      }
    }

    const element = document.createElement('div');
    document.body.appendChild(element);

    ReactDOM.render(
      <div>
        <ComponentConnectedToRoot ref={ref => { rootComponentReference = ref; }} />
        <ComponentConnectedToBranchA ref={ref => { branchAComponentReference = ref; }} />
        <ComponentConnectedToBranchB ref={ref => { branchBComponentReference = ref; }} />
        <ComponentAlsoConnectedToBranchB ref={ref => { secondBranchBComponentReference = ref; }} />
      </div>,
      element
    );

    await rootComponentMounted;
    await branchAComponentMounted;
    await branchBComponentMounted;
    await secondBranchBComponentMounted;

    const componentGroups = store.componentGroups;

    // ensure that there are three groups
    expect(componentGroups.size).to.be.equal(3);

    // ensure that there are two component connected to the group that selected `branchB`
    expect(componentGroups.get(firstInstance.branchB)!.components.size).to.be.equal(2);

    // ensure that within, those three groups, all the respective components have been connected
    expect(Array
      .from(componentGroups.values())
      .filter(componentGroup => componentGroup.components.has(rootComponentReference))
      .length
    ).to.be.equal(1);

    expect(Array
      .from(componentGroups.values())
      .filter(componentGroup => componentGroup.components.has(branchAComponentReference))
      .length
    ).to.be.equal(1);

    expect(Array
      .from(componentGroups.values())
      .filter(componentGroup => componentGroup.components.has(branchBComponentReference))
      .length
    ).to.be.equal(1);

    expect(Array
      .from(componentGroups.values())
      .filter(componentGroup => componentGroup.components.has(secondBranchBComponentReference))
      .length
    ).to.be.equal(1);

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