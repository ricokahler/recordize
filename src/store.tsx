import * as Immutable from 'immutable';
import { merge } from 'lodash';
import * as React from 'react';
import * as Rx from 'rxjs';
import * as ReactDOM from 'react-dom';

function define<T>(recordDefault: T) {
  const BaseRecordClass: new (t?: Partial<T>) => Immutable.Record<T> = Immutable.Record(recordDefault);
  class RecordClass extends BaseRecordClass {
    static _recordDefault = recordDefault;
  }
  return RecordClass as any as new (t?: Partial<T>) => Immutable.Record<T> & Readonly<T> & RecordClass;
}

const Record = {
  define
};

function createGraph<T>(TFactory: new (t?: Partial<T>) => Immutable.Record<T> & Readonly<T>) {

  const instancePointer = {
    instance: undefined as any as Immutable.Record<T> & Readonly<T>,
  };

  function wrap<V>(factory: new (v?: Partial<V>) => Immutable.Record<V> & Readonly<V>) {
    const Factory = factory as new (v?: Partial<V>) => Immutable.Record<V>;

    // memo, given an instance will return another memo.
    // if you get that memo the params, it will return the value
    type Parameter = Immutable.Record<any> | Immutable.Map<string, any>;
    type MethodCache = WeakMap<Wrapped, Immutable.Map<Parameter, any>>;
    const cache: { [key: string]: MethodCache | undefined } = {};

    class Wrapped extends Factory {

      get graph() {
        return instancePointer.instance;
      }

      getOrCalculate<R, U extends { [key: string]: Immutable.Record<any> } | Immutable.Record<any>>(
        key: string,
        using: (t: T) => U,
        calculate: (u: U) => R
      ) {

        // return calculate(using(this.graph));

        const methodCache = cache[key] || new WeakMap<Wrapped, Immutable.Map<Parameter, any>>();
        const valueCache = methodCache.get(this) || Immutable.Map<Parameter, any>();
        const paramsGiven = using(this.graph);
        if (typeof paramsGiven !== 'object') {
          throw new Error('params must be an object');
        }
        const lookupableParameters = (/*if*/ Immutable.isCollection(paramsGiven)
          // the `using` traversal mapped directly
          ? paramsGiven as Immutable.Record<any>
          // the `using` traversal mapped to an object first
          : Immutable.fromJS(paramsGiven) as Immutable.Map<string, any>
        );

        if (valueCache.has(lookupableParameters)) {
          return valueCache.get(lookupableParameters);
        }

        const value = calculate(paramsGiven);
        const newValueCache = valueCache.set(lookupableParameters, value);
        methodCache.set(this, newValueCache);
        cache[key] = methodCache;
        return value;
      }
    }

    return Wrapped as new (v?: Partial<V>) => Immutable.Record<V> & Readonly<V> & Wrapped;
  }

  function base<V>(vRecordDefault: V) {
    const tRecordDefault = (TFactory as any)._recordDefault as T;
    const recordDefault = merge(vRecordDefault, tRecordDefault);
    const Factory = Immutable.Record(
      recordDefault
    ) as new (p?: Partial<T & V>) => Immutable.Record<T & V>;

    class GraphBase extends Factory {
      constructor(...args: any[]) {
        super(...args);
        (instancePointer as any).instance = this;
      }
    }

    const persistentChanges: Array<keyof Immutable.Record<any>> = [
      'set', 'update', 'merge', 'mergeDeep', 'mergeWith', 'mergeDeepWith', 'delete', 'clear',
      'setIn', 'updateIn', 'mergeIn', 'mergeDeepIn', 'deleteIn', 'withMutations', 'asMutable',
      'asImmutable'
    ];

    persistentChanges.forEach(method => {
      (GraphBase.prototype as any)[method] = function (...args: any[]) {
        const result = (Factory.prototype as any)[method].call(this, ...args);
        (instancePointer as any).instance = result;
        return result;
      }
    });

    return GraphBase as new (v?: Partial<T & V>) => Immutable.Record<T & V> & Readonly<T & V> & GraphBase;
  }

  return { wrap, base };
}

type V<T, A> = {
  [K in keyof A]: {
    get: (t: T) => A[K],
    set: (t: T, value?: any) => T
  }
};

function createStore<T extends Immutable.Record<any>>(t: T) {
  const updateStream = new Rx.Subject<(previousStore: T) => T>();
  const stateStream = updateStream.scan((state, update) => {
    return update(state);
  }, t);
  function connect<A extends any>(mapping: V<T, A>) {
    abstract class ComponentClass<P, S> extends React.Component<P, A & S> {
      constructor(props: P, context?: any) {
        super(props, context);

        const defaultStateFromStore = Object.entries(mapping).reduce((stateToSet, [key, pathGetter]) => {
          stateToSet[key] = pathGetter.get(t)
          return stateToSet;
        }, {} as A);
        this.state = Object.freeze(merge(defaultStateFromStore, this.defaultState));

        stateStream.subscribe(store => {
          const stateToSet = Object.entries(mapping).reduce((stateFromStore, [key, pathGetter]) => {
            stateFromStore[key] = pathGetter.get(store)
            return stateFromStore;
          }, {} as A);
          this.setState(previousState => ({ ...(previousState as any), ...(stateToSet as any) }))
        });
      }

      abstract get defaultState(): S;

      updateStream = updateStream;

      sendUpdate(update: (previousState: A) => A) {
        updateStream.next(previousStore => {

          const ps = Object.entries(mapping).reduce((stateToSet, [key, pathGetter]) => {
            stateToSet[key] = pathGetter.get(previousStore)
            return stateToSet;
          }, {} as A);

          const s = update(ps);

          const newStore = Object.entries(s).reduce((newStore, [_key, newValue]) => {
            const key = _key as keyof A;
            const path = mapping[key];
            return path.set(newStore, newValue)
          }, previousStore);

          return newStore;
        });
      }

      sendGlobalUpdate(update: (previousStore: T) => T) {
        updateStream.next(update);
      }
    }
    return ComponentClass;
  }

  return { connect };
}

class Sub extends Record.define({
  something: 'some value'
}) { }

class Simple extends Record.define({
  count: 0,
  hello: 'world',
  sub: new Sub()
}) { }

const store = createStore(new Simple());

interface SomeComponentProps {
  test?: number
}
interface SomeComponentState { }

class SomeComponent extends store.connect({
  count: {
    get: store => store.count,
    set: (store, value) => store.set('count', value)
  },
  sub: {
    get: store => store.sub,
    set: (store, value) => store.set('sub', value)
  },
})<SomeComponentProps, SomeComponentState> {

  get defaultState() {
    return {}
  }

  render() {
    return <div>
      <span>sub something: {this.state.sub.something}</span>
      <h1>{this.state.count}</h1>
      <button onClick={() => {
        this.updateStream.next(store => store.update('count', count => count + 1))
      }}>+</button>
      <button onClick={() => {
        this.sendUpdate(ps => ({ ...ps, count: ps.count + 1, sub: ps.sub.set('something', 'new value') }))
      }}>-</button>
      <CountDisplay count={this.state.count} />
    </div>;
  }
}

function CountDisplay(props: { count: number }) {
  return <h2>from count display: {props.count}</h2>;
}

interface SomeInputComponentProps {
  someProp?: number
}

interface SomeInputComponentState {
  count: number
}

class SomeInputComponent extends store.connect({
  hello: {
    get: store => store.hello,
    set: (store, value) => store.set('hello', value)
  },
})<SomeInputComponentProps, SomeInputComponentState> {

  get defaultState() {
    return { count: 0 };
  }

  render() {
    return <div>
      <h1>Hello, {this.state.hello}!</h1>
      <button onClick={() => {
        this.setState(ps => ({ ...ps, count: ps.count + 1 }))
      }}>internal count: {this.state.count}</button>
      <SomeComponent />
      <input
        type="text"
        onInput={e => {
          // this.sendGlobalUpdate(store => store.set('hello', e.currentTarget.value));
          this.sendUpdate(ps => ({ ...ps, hello: e.currentTarget.value }));
        }}
        defaultValue={this.state.hello}
      />
    </div>
  }
}

ReactDOM.render(<div>
  <SomeComponent />
  <SomeInputComponent />
  <SomeInputComponent />
  <SomeInputComponent />
  <SomeInputComponent />
  <SomeInputComponent />
</div>, document.querySelector('.app'));