process.env.TS_NODE_TYPE_CHECK = 'true';
import { expect } from 'chai';
import { oneLine } from 'common-tags';
import * as React from 'react';
import * as Immutable from 'immutable';
import * as ReactDOM from 'react-dom';
import { JSDOM } from 'jsdom';

import * as Record from '../src';
import { DeferredPromise } from './util';

const document = (global as any).document || new JSDOM().window.document;

function wait(milliseconds: number) {
  return new Promise(resolve => setTimeout(() => resolve(), milliseconds));
}

describe('Store', function () {
  it(`mounts and unmounts components correctly`, async function () {

    let propCallCount = 0;

    class BranchARecord extends Record.define({
      branchAKey: 'branch a value',
      get prop() {
        propCallCount += 1;
        return 'test';
      }
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
    const abComponentMounted = new DeferredPromise();

    const rootComponentUnmounted = new DeferredPromise();
    const branchAComponentUnmounted = new DeferredPromise();
    const branchBComponentUnmounted = new DeferredPromise();
    const secondBranchBComponentUnmounted = new DeferredPromise();

    let rootComponentReference: any;
    let branchAComponentReference: any;
    let branchBComponentReference: any;
    let secondBranchBComponentReference: any;
    let abComponentReference: any;

    let wrapperRef: Wrapper = undefined as any;
    const capturedWrapperRef = new DeferredPromise();

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

      componentWillUnmount() {
        super.componentWillUnmount();
        rootComponentUnmounted.resolve();
      }

      render() {
        return <div />;
      }
    }

    class ComponentConnectedToBranchA extends store.connect({
      scope: store => store.branchA,
      descope: (store, branchA: BranchARecord) => store.set('branchA', branchA),
      get: branchA => ({
        fromBranchA: branchA.branchAKey,
      }),
      set: (branchA, value) => branchA.set('branchAKey', value.fromBranchA),
    }) {

      componentDidMount() {
        super.componentDidMount();
        branchAComponentMounted.resolve();
      }

      componentWillUnmount() {
        super.componentWillUnmount();
        branchAComponentUnmounted.resolve();
      }

      render() {
        return <div />;
      }
    }

    class ComponentConnectedToBranchB extends store.connect({
      scope: store => store.branchB,
      descope: (store, branchB: BranchBRecord) => store.set('branchB', branchB),
      get: branchB => ({
        fromBranchB: branchB.branchBKey,
      }),
      set: (branchB, value) => branchB.set('branchBKey', value.fromBranchB),
    }) {

      componentDidMount() {
        super.componentDidMount();
        branchBComponentMounted.resolve();
      }

      componentWillUnmount() {
        super.componentWillUnmount();
        branchBComponentUnmounted.resolve();
      }

      render() {
        return <div />;
      }
    }

    class ComponentAlsoConnectedToBranchB extends store.connect({
      scope: store => store.branchB,
      descope: (store, branchB: BranchBRecord) => store.set('branchB', branchB),
      get: branchB => ({
        fromBranchB: branchB.branchBKey,
      }),
      set: (branchB, value) => branchB.set('branchBKey', value.fromBranchB),
    }) {

      componentDidMount() {
        super.componentDidMount();
        secondBranchBComponentMounted.resolve();
      }

      componentWillUnmount() {
        super.componentWillUnmount();
        secondBranchBComponentUnmounted.resolve();
      }

      render() {
        return <div />;
      }
    }

    class ComponentConnectedToBranchAAndB extends store.connect({
      scope: store => Immutable.Map({ a: store.branchA, b: store.branchB }),
      descope: (store, m: Immutable.Map<string, any>) => (store
        .set('branchA', m.get('a'))
        .set('branchB', m.get('b'))
      ),
      get: ab => ({}),
      set: ab => ab,
    }) {
      componentDidMount() {
        super.componentDidMount();
        abComponentMounted.resolve();
      }

      render() {
        return <div />;
      }
    }

    const element = document.createElement('div');

    class Wrapper extends React.Component<{}, { mounted: boolean }> {
      constructor(props: {}) {
        super(props);
        this.state = { mounted: false };
      }

      render() {
        return <div>
          {/*if*/ this.state.mounted
            ? <div>
              <ComponentConnectedToRoot ref={ref => { rootComponentReference = ref; }} />
              <ComponentConnectedToBranchA ref={ref => { branchAComponentReference = ref; }} />
              <ComponentConnectedToBranchB ref={ref => { branchBComponentReference = ref; }} />
              <ComponentAlsoConnectedToBranchB ref={ref => { secondBranchBComponentReference = ref; }} />
              <ComponentConnectedToBranchAAndB ref={ref => { abComponentReference = ref; }} />
            </div>
            : <div />
          }
          <ComponentConnectedToBranchAAndB ref={ref => { abComponentReference = ref; }} />
        </div>;
      }
    }

    ReactDOM.render(<Wrapper ref={ref => {
      if (ref) {
        wrapperRef = ref;
        capturedWrapperRef.resolve();
      }
    }} />, element);

    await capturedWrapperRef;

    wrapperRef.setState(previousState => ({ ...previousState, mounted: true }));

    await rootComponentMounted;
    await branchAComponentMounted;
    await branchBComponentMounted;
    await secondBranchBComponentMounted;
    await abComponentMounted;

    const componentGroups = store.componentGroups;

    // ensure that there are four groups
    expect(componentGroups.size).to.be.equal(4);

    // ensure that there are two component connected to the group that scoped `branchB`
    expect(componentGroups.get(firstInstance.branchB.hashCode())!.components.size).to.be.equal(2);

    // ensure value equality works
    expect(componentGroups.get(
      Immutable.Map({ a: firstInstance.branchA, b: firstInstance.branchB }).hashCode()
    )).to.not.be.undefined;

    // ensure memoized hashCodes work
    expect(propCallCount).to.be.equal(1);

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

    expect(Array
      .from(componentGroups.values())
      .filter(componentGroup => componentGroup.components.has(abComponentReference))
      .length
    ).to.be.equal(1);

    wrapperRef.setState(previousState => ({ ...previousState, mounted: false }));

    await rootComponentUnmounted;
    await branchAComponentUnmounted;
    await branchBComponentUnmounted;
    await secondBranchBComponentUnmounted;

    // everything expect `ComponentConnectedToBranchAAndB` should be unmounted
    expect(componentGroups.size).to.be.equal(1);

    expect(Array
      .from(componentGroups.values())
      .filter(componentGroup => componentGroup.components.has(rootComponentReference))
      .length
    ).to.be.equal(0);

    expect(Array
      .from(componentGroups.values())
      .filter(componentGroup => componentGroup.components.has(branchAComponentReference))
      .length
    ).to.be.equal(0);

    expect(Array
      .from(componentGroups.values())
      .filter(componentGroup => componentGroup.components.has(branchBComponentReference))
      .length
    ).to.be.equal(0);

    expect(Array
      .from(componentGroups.values())
      .filter(componentGroup => componentGroup.components.has(secondBranchBComponentReference))
      .length
    ).to.be.equal(0);

    expect(Array
      .from(componentGroups.values())
      .filter(componentGroup => componentGroup.components.has(abComponentReference))
      .length
    ).to.be.equal(1);
  });

  it(`sets the correct state considering the 'currentStore' and 'initialState'`, async function () {
    class FooRecord extends Record.define({
      foo: 'foo from store',
      bar: 'bar from store',
    }) { }

    const store = Record.createStore(new FooRecord());
    const firstComponentDidMount = new DeferredPromise();
    const secondComponentDidMount = new DeferredPromise();

    let wrapperRef: Wrapper = undefined as any;
    const wrapperRefCaptured = new DeferredPromise();

    class FirstComponent extends store.connect({
      get: store => ({
        fooFromStore: store.foo,
        barFromStore: store.bar,
      }),
      set: store => store,
      initialState: {
        fooFromInitialState: 'foo from initial state',
        barFromInitialState: 'bar from initial state',
      }
    }) {

      componentDidMount() {
        super.componentDidMount();
        expect(this.state.fooFromStore).to.be.equal('foo from store');
        expect(this.state.barFromStore).to.be.equal('bar from store');
        expect(this.state.fooFromInitialState).to.be.equal('foo from initial state');
        expect(this.state.barFromInitialState).to.be.equal('bar from initial state');
        firstComponentDidMount.resolve();
      }

      render() {

        return <div />;
      }
    }

    class SecondComponent extends store.connect({
      get: store => ({
        fooFromStore: store.foo,
        barFromStore: store.bar,
      }),
      set: (store) => store,
    }) {

      componentDidMount() {
        super.componentDidMount();
        // ensure that, when this component mounts, it has the value of the current state.
        expect(this.state.fooFromStore).to.be.equal('foo changed');
        secondComponentDidMount.resolve();
      }

      render() {
        return <div />;
      }
    }

    class Wrapper extends React.Component<{}, { mountSecondComponent: boolean }> {
      constructor(props: {}) {
        super(props);
        this.state = {
          mountSecondComponent: false,
        };
      }

      render() {
        this.state.mountSecondComponent
        return <div>
          <FirstComponent />
          {/*if*/ this.state.mountSecondComponent ? <SecondComponent /> : null}
        </div>;
      }
    }

    const element = document.createElement('div');

    ReactDOM.render(<Wrapper ref={ref => {
      if (!ref) { return; }
      wrapperRef = ref;
      wrapperRefCaptured.resolve();
    }} />, element);

    // ensure that the tests written in the first component's `componentDidMount` runs
    await firstComponentDidMount;

    // ensure the reference has been captured
    await wrapperRefCaptured;

    // send an update changing the store's value of 'foo'
    store.sendUpdate(store => store.set('foo', 'foo changed'));

    // tell the wrapper to mount the second component
    wrapperRef.setState(previousState => ({ ...previousState, mountSecondComponent: true }));

    // ensure the tests written in the second component's `componentDidMount` runs
    await secondComponentDidMount;
  });

  it(`updates with 'setStore' or 'setGlobalStore' or 'sendUpdate'`, async function () {
    class FooRecord extends Record.define({
      foo: 'initial foo',
      bar: 'initial bar',
      baz: 'initial baz',
    }) { }

    const store = Record.createStore(new FooRecord());
    let componentRef: Component = undefined as any;
    const capturedRef = new DeferredPromise();

    class Component extends store.connect({
      get: store => ({
        foo: store.foo,
        bar: store.bar,
      }),
      set: (store, value) => store.set('foo', value.foo).set('bar', value.bar),
    }) {

      componentDidMount() {
        super.componentDidMount();
      }

      render() {
        return <div />;
      }
    }

    expect(store.current().foo).to.be.equal('initial foo');
    expect(store.current().bar).to.be.equal('initial bar');
    expect(store.current().baz).to.be.equal('initial baz');

    const element = document.createElement('div');
    ReactDOM.render(<Component ref={ref => {
      if (!ref) { return; }
      componentRef = ref;
      capturedRef.resolve();
    }} />, element);
    await capturedRef;

    // send update using `setStore`
    componentRef.setStore(previousState => ({
      ...previousState,
      foo: 'new foo',
    }));
    expect(store.current().foo).to.be.equal('new foo');

    // send update using `setGlobalStore` 
    componentRef.setGlobalStore(store => store.set('bar', 'new bar'));
    expect(store.current().bar).to.be.equal('new bar');

    // send update using `sendUpdate`
    store.sendUpdate(store => store.set('baz', 'new baz'));
    expect(store.current().baz).to.be.equal('new baz');
  });

  it(`updates only the respective components considering 'scope'`);

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

  it(`infers the correct type of 'StateFromStore' when using scope`, function () {
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
      scope: store => store.nestedRecord,
      // TODO: this `nestedRecord` needs to be type asserted for some reason
      descope: (store, nestedRecord: NestedRecord) => store.set('nestedRecord', nestedRecord),
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