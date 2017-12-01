import * as Immutable from 'immutable';

interface HasInit {
  init: () => void;
}

function createStore<V, R>(
  getDefault: () => V,
  storeDefinition: (Definition: Immutable.Record.Factory<V>) => new (v?: V) => R
) {

  const instancePointer = {
    store: undefined as any as R
  };

  function r<R>(t: new (...params: any[]) => R) {
    return t as new (...params: any[]) => R;
  }

  function define<T>(recordDefault: T) {
    const memo = new WeakMap<any, any>();


    const RecordClass = Immutable.Record(recordDefault) as new (t?: T) => Immutable.Record<T>;

    class TheClass extends RecordClass {
      get store() {
        return instancePointer.store;
      }
      getOrCalculate<T>(key: string, calculate: () => T): T {
        if (memo.has(this)) {
          return memo.get(this);
        }
        const value = calculate();
        memo.set(this, value);
        return value;
      }
    }

    return TheClass as new (t?: T) => Immutable.Record<T> & Readonly<T> & TheClass;
  }

  function init() {
    // const Store = storeDefinition(recordDefault => {
    //   return Immutable.Record(recordDefault);
    // });

    // instancePointer.store = new Store();
  }


  return {
    define,
    get instance() {
      return instancePointer.store;
    },
    init
  };
}

const store = createStore(() => ({
  a: 5,
  user: new User(),
}), Definition => class extends Definition {
  method() {
    
  }
});

class User extends store.define({ b: 5 }) {
  method() {
    // this.store
  }

  get computed() {
    return this.getOrCalculate('test', () => {
      return 4;
    });
  }
}