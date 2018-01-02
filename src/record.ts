import * as Immutable from 'immutable';

export function define<T>(recordDefault: T) {
  const BaseRecordClass: new (t?: Partial<T>) => Immutable.Record<T> = Immutable.Record(recordDefault);
  const cache = new Map<string, WeakMap<any, any>>();
  class RecordClass extends BaseRecordClass {
    getOrCalculate<V>(name: string, dependencies: any[], supplier: () => V) {
      const maybeValue = dependencies.reduce((acc, dependency) => {
        const memo = acc || new WeakMap();
        return memo.get(dependency);
      }, cache.get(name)) as V | undefined;

      if (maybeValue !== undefined) { return maybeValue; }
      const value = supplier();

      let a = cache.get(name) || new WeakMap();
      let b = [];
      for (let dependency of dependencies) {
        const m = a.get(dependency) || new WeakMap();
        b.push([m, dependency]);
        a = m;
      }

      let v = value;
      for (let [map, dependency] of b.reverse()) {
        map.set(dependency, v);
        v = map;
      }
      // console.log(b);

      cache.set(name, v as any);

      return value;
    }
  }
  return RecordClass as new (t?: Partial<T>) => Immutable.Record<T> & Readonly<T> & RecordClass;
}
