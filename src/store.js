function createStore(StoreClass) {
    const instance = new StoreClass();
    function define() {
        return class {
            constructor() {
                this.store = instance;
            }
            computedValue() {
                console.log(this);
            }
        };
    }
    function init() {
        instance.init();
    }
    return { define, instance, init };
}
const store = createStore(class {
    constructor() {
        this.someValue = 'hello';
    }
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
        this.computedValue();
        return 4;
    }
}
class Todo extends store.define() {
    get otherComputed() {
        this.computedValue();
        return 7;
    }
}
store.init();
console.log(store.instance.user.computed);
console.log(store.instance.someTodo.otherComputed);
