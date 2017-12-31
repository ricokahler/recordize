import * as Immutable from 'immutable';
import { merge } from 'lodash';

export function createGraph<T>(
  TFactory: new (t?: Partial<T>) => Immutable.Record<T> & Readonly<T>
) {

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