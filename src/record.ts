import * as Immutable from 'immutable';

export function define<T>(recordDefault: T) {
  const BaseRecordClass: new (t?: Partial<T>) => Immutable.Record<T> = Immutable.Record(recordDefault);
  const cache = new Map<string, WeakMap<any, any>>();
  class RecordClass extends BaseRecordClass {
    getOrCalculate<V>(name: string, a: any[] | (() => V), b?: () => V) {
      const dependencies = /*if*/ Array.isArray(a) ? a : [this];
      const calculate = /*if*/ typeof b === 'function' ? b : a;
      if (Array.isArray(calculate)) {
        throw new Error(`Did not pass a 'calculate' function to 'getOrCalculate'.`);
      }

      const maybeValue = dependencies.reduce((acc, dependency) => {
        const memo = acc || new WeakMap();
        return memo.get(dependency);
      }, cache.get(name)) as V | undefined;

      if (maybeValue !== undefined) { return maybeValue; }

      let map = cache.get(name) || new WeakMap();
      const mapTuples = [];
      for (let dependency of dependencies) {
        const m = map.get(dependency) || new WeakMap();
        mapTuples.push([m, dependency]);
        map = m;
      }

      const value = calculate();
      let v = value as any;
      for (let [map, dependency] of mapTuples.reverse()) {
        map.set(dependency, v);
        v = map;
      }
      cache.set(name, v);
      return value;
    }
  }
  return RecordClass as new (t?: Partial<T>) => Immutable.Record<T> & Readonly<T> & RecordClass;
}
