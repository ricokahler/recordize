interface HasInit {
  init: () => void;
}

function createStore<T extends HasInit>(StoreClass: new (...params: any[]) => T) {

  const instance = new StoreClass();

  function define() {
    const memo = new WeakMap<any, any>();
    return class {
      store = instance;
      getOrCalculate<T>(key: string, calculate: () => T): T {
        if (memo.has(this)) {
          return memo.get(this);
        }
        const value = calculate();
        memo.set(this, value);
        return value;
      }
    }
  }

  function init() {
    instance.init();
  }

  return { define, instance, init };
}

const store = createStore(class {
  someValue = 'hello';
  user: User;
  someTodo: Todo;

  init() {
    this.user = new User();
    this.someTodo = new Todo();
  }
});



class User extends store.define() {
  method() {
    return this.store.user.store.user.store.someValue;
  }

  get computed() {
    return this.getOrCalculate('test', () => {
      return 4;
    });
  }
}

class Todo extends store.define() {
}

store.init();


