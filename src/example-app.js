"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("./store");
const record_1 = require("./record");
const React = require("react");
class AppData extends record_1.Recordize({
    name: '',
    email: '',
    courses: {}
}) {
}
class AppUi extends record_1.Recordize({
    modalOpen: false,
}) {
    get computedProperty() {
        return this.getOrCalculate();
    }
}
class AppStore extends record_1.Recordize({}) {
}
const store = store_1.createStore();
store.define({
    User: Model => class extends Model {
        get computed() {
            return this.other;
        }
    }
});
class User extends store.something() {
    get todos() {
        const todos = this.store.todos.first();
        return todos;
    }
}
class AppState extends record_1.Recordize({
    user: new User()
}) {
}
const s = store_1.createStore(new AppState());
class App extends store.connect({
    ui: store => store.app,
    data: dataStore => dataStore.app,
}) {
    render() {
        return React.createElement("div", null,
            this.ui.modalOpen && React.createElement("div", null),
            React.createElement("button", { onClick: () => {
                    this.sendUpdate(previous => ({
                        data: previous.data.set('count'),
                        ui: previous.ui.set('modalOpen', true)
                    }));
                } },
                "click ",
                this.ui.count));
    }
}
class Route extends store.connect({
    ui: store => store.ui.someRoute,
    data: store => store.app.data,
}) {
    constructor() {
        super(...arguments);
        this.inc = () => {
            this.sendUpdate({});
        };
    }
    render() {
    }
}
exports.Route = Route;
store.stream({
    data: dataStore => dataStore.app
}).distinctUntilChanged().subscribe(appData => fetch('/api/data', {
    method: 'POST'
}));
