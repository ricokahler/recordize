# Recordize

> a state management library revolving around simplicity amd immutable records

**This library is a big work-in-progress!** There are no released versions yet. Check back soon.

# Motivation

Redux is cool and all but there's a bit too much indirection. At the end of the day, all you want to do is dispatch an update to the global store. Moreover, you might have been told to use immutable data structures with Redux to aid in performance.

Well that's were Recordize comes in. Recodize is an even simpler state management library that does everything Redux can (or is planned to meet the needs of Redux users soon).

# [Todo Example](./examples/todos/)

```tsx
import * as React from 'react';
import * as Record from 'recordize';
import * as Immutable from 'immutable';
import * as uuid from 'uuid/v4';

class TodoRecord extends Record.define({
  id: '',
  name: '',
  completed: false,
  position: 0,
}) { }

const memo = new WeakMap();
class AppRecord extends Record.define({
  todos: Immutable.Map(),
  visibilityFilter: 'All',
}) {
  get todoArray() {
    if (memo.has(this)) {
      return memo.get(this);
    }
    const value = (this.todos
      .valueSeq()
      .filter(todo => {
        if (this.visibilityFilter === 'Active') {
          return !todo.completed;
        } else if (this.visibilityFilter === 'Completed') {
          return todo.completed;
        }
        return true;
      })
      .sortBy(todo => todo.position)
      .toArray()
    );
    memo.set(this, value);
    return value;
  }

  get itemsLeft() {
    return this.todos.valueSeq().filter(todo => !todo.completed).count();
  }

  get completedItemsCount() {
    return this.todos.valueSeq().filter(todo => todo.completed).count();
  }
}

const store = Record.createStore(new AppRecord());

let i = 0;
class NewTodo extends store.connect({
  get: () => ({ newTodo: '' }),
  set: (store, { newTodo }) => {
    const id = uuid();
    return store.update('todos', todos => todos.set(id, new TodoRecord({
      id,
      name: newTodo,
      position: i++
    })));
  }
}) {

  inputRef = document.createElement('input'); // create element so its never undefined
  handleInputRef = ref => this.inputRef = ref;

  handleSubmit = e => {
    e.preventDefault();
    this.setStore(previousState => ({
      ...previousState,
      newTodo: this.inputRef.value,
    }));
    this.inputRef.value = '';
  }

  render() {
    return <form className="new-todo" onSubmit={this.handleSubmit}>
      <input type="text" placeholder="What needs to be done?" ref={this.handleInputRef} />
    </form>
  }
}

class Todo extends store.connect({
  get: (store, { id }) => {
    const todo = store.todos.get(id) || new TodoRecord();
    return {
      name: todo.name,
      completed: todo.completed,
      deleted: false,
    }
  },
  set: (store, { name, completed, deleted }, { id }) => {
    if (deleted) {
      return store.update('todos', todos => todos.delete(id));
    }
    return store.update('todos', todos =>
      todos.update(id, todo =>
        todo.set('name', name).set('completed', completed)
      )
    );
  }
}) {

  constructor(...params) {
    super(...params);
    this.inputId = `checkbox-${uuid()}`;
  }

  handleDelete = () => {
    this.setStore(previousStore => ({
      ...previousStore,
      deleted: true,
    }))
  }

  render() {
    return <div className="todo">
      <input
        id={this.inputId}
        className="todo--checkbox"
        type="checkbox"
        checked={this.state.completed} onChange={e => {
          this.setStore(previousStore => ({
            ...previousStore,
            completed: !previousStore.completed,
          }))
        }} />
      <label className="todo--label" htmlFor={this.inputId}>{this.state.name}</label>
      <button
        onClick={this.handleDelete}
        className="todo--delete"
      >delete</button>
    </div>
  }
}

class TodoList extends store.connect({
  get: store => ({
    todosIds: store.todoArray.map(todo => todo.id),
  }),
  set: store => store,
}) {
  render() {
    return <div className="todo-list">
      {this.state.todosIds.map(id => <Todo key={id} id={id} />)}
    </div>
  }
}

class VisibilityFilter extends store.connect({
  get: store => ({
    visibilityFilter: store.visibilityFilter,
  }),
  set: (store, { visibilityFilter }) => store.set('visibilityFilter', visibilityFilter),
}) {

  handleClick(filter) {
    this.setStore(previousStore => ({
      ...previousStore,
      visibilityFilter: filter,
    }));
  }

  render() {
    return <div className="visibility-filter">
      {['All', 'Active', 'Completed'].map((filter, key) => <button
        className={`visibility-filter__button${/*if*/ this.state.visibilityFilter === filter
          ? ' visibility-filter__button--active'
          : ''
          }`}
        key={key}
        onClick={() => this.handleClick(filter)}
      >{filter}</button>)}
    </div>
  }
}

class App extends store.connect({
  get: store => ({
    itemsLeft: store.itemsLeft,
    completedItemsCount: store.completedItemsCount,
  }),
  set: store => store,
}) {

  handleClearCompleted = () => {
    this.setGlobalStore(store => {
      const completedTodos = (store.todos
        .valueSeq()
        .filter(todo => todo.completed)
        .map(todo => todo.id)
      );
      return store.update('todos', todos => todos.deleteAll(completedTodos));
    });
  }

  render() {
    return <div className="todo-app">
      <NewTodo />
      <TodoList />
      <div className="footer">
        <span>{this.state.itemsLeft} items left</span>
        <VisibilityFilter />
        <button
          onClick={this.handleClearCompleted}
          className={`clear-completed${/*if*/ this.state.completedItemsCount > 0
            ? ''
            : ' clear-completed--hidden'
            }`}
        >Clear completed</button>
      </div>
    </div>;
  }
}

store.stateStream.subscribe(state => {
  console.log('new state', state.toJS());
})

export default App;
```

![screenshot](./screenshot.png)

# Planned features

* serialization/deserialization
* fast JSON merge-patch for efficient network requests
* server side endpoint factory
* calculated property hashing
* "graph" API
* compatibility with Redux middleware

Check back soon for more development news. Drop an issue if you'd like to see a feature or if you want to help out.