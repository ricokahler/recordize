import * as Immutable from 'immutable';

export function define<T>(recordDefault: T) {
  const BaseRecordClass: new (t?: Partial<T>) => Immutable.Record<T> = Immutable.Record(recordDefault);
  const cache = new Map<string, WeakMap<any, any>>();
  const hashCodeCache = new WeakMap<RecordClass, number>();
  // TODO: investigate: caching equals calls might waste too much memory vs saving computation time
  const equalsCache = new WeakMap<RecordClass, WeakMap<any, boolean>>();
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

    hashCode() {
      if (hashCodeCache.has(this)) {
        return hashCodeCache.get(this)!;
      }
      const hashCode = super.hashCode();
      hashCodeCache.set(this, hashCode);
      return hashCode;
    }

    equals(other: any) {
      if (other === undefined) { return false; }
      // this optimization only works if the argument is immutable as well
      if (!Immutable.isImmutable(other)) { return super.equals(other); }

      if (!equalsCache.has(this)) { equalsCache.set(this, new WeakMap()); }
      const equalityCache = equalsCache.get(this)!;
      if (equalityCache.has(other)) {
        return equalityCache.get(other)!;
      }

      const equals = super.equals(other);
      equalityCache.set(other, equals);
      return equals;
    }
  }
  return RecordClass as new (t?: Partial<T>) => Immutable.Record<T> & Readonly<T> & RecordClass;
}
