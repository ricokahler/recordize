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

type V<T, A> = {[K in keyof A]: (t: T) => A[K]};

function createStore<T>(t: T) {
  const updateStream = new Rx.Subject<(previousStore: T) => T>();
  const stateStream = updateStream.scan((state, update) => {
    return update(state)
  }, t);
  function connect<P, S, A extends any>(params: V<T, A>) {
    class ComponentClass extends React.Component<P, A> {
      constructor(props: P, context?: any) {
        super(props, context);
        this.state = Object.entries(params).reduce((stateToSet, [key, pathGetter]) => {
          stateToSet[key] = pathGetter(t)
          return stateToSet;
        }, {} as A);
        stateStream.subscribe(state => {
          console.log({state})
          const stateToSet = Object.entries(params).reduce((stateToSet, [key, pathGetter]) => {
            stateToSet[key] = pathGetter(state)
            return stateToSet;
          }, {} as A);
          this.setState(previousState => ({ ...(previousState as any), ...(stateToSet as any) }))
        });
      }

      updateStream = updateStream;

      // sendUpdate(updater: (previousState: {[P in keyof O]: any}) => {[P in keyof O]: any}) {
      //   updateStream.next(previousStore => {
      //     Object.entries(params).reduce((stateToSet, [key, pathGetter]) => {
      //       stateToSet[key] = pathGetter(previousStore)
      //       return stateToSet;
      //     }, {} as any);

      //     return previousStore;
      //   });
      // }
    }
    return ComponentClass;
  }

  return { connect };
}

class Simple extends Record.define({
  count: 0,
}) { }


const store = createStore(new Simple());

class SomeComponent extends store.connect({
  count: store => store.count
}) {

  render() {
    return <div>
      <h1>{this.state.count}</h1>
      <button onClick={() => {
        this.updateStream.next(store => store.update('count', count => count + 1))
      }}>+</button>
    </div>;
  }
}


ReactDOM.render(<SomeComponent />, document.querySelector('.app'));