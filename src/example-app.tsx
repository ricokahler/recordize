import { createStore } from './store';
import { Recordize } from './record';
import * as React from 'react';

class AppData extends Recordize({
  name: '',
  email: '',
  courses: {}
}) {

}

class AppUi extends Recordize({
  modalOpen: false,
  
}) {
  get computedProperty() {
    return this.getOrCalculate();
  }
}

class AppStore extends Recordize({

}) {

}

const store = createStore();

store.define({
  User: Model => class extends Model {
    get computed() {
      return this.other
    }
  }
})

class User extends store.something() {
  get todos() {
    const todos = this.store.todos.first();
    return todos;
  }
}

class AppState extends Recordize({
  user: new User()
}) {

}

const s = createStore(new AppState())

class App extends store.connect({
  ui: store => store.app,
  data: dataStore => dataStore.app,
}) {
  render() {
    return <div>
      {/*if*/ this.ui.modalOpen && <div></div>}
      <button onClick={() => {
        this.sendUpdate(previous => ({
          data: previous.data.set('count'),
          ui: previous.ui.set('modalOpen' , true)
        }))
      }}>click {this.ui.count}</button>

    </div>
  }
}

export class Route extends store.connect({
  ui: store => store.ui.someRoute,
  data: store => store.app.data,
}) {
  render() {
  }

  inc = () => {
    this.sendUpdate({});
  }
}

store.stream({
  data: dataStore => dataStore.app
}).distinctUntilChanged().subscribe(appData => fetch('/api/data', {
  method: 'POST'
}));