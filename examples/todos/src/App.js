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

/** @type {Immutable.Map<string, TodoRecord>} */
const todoMap = Immutable.Map();

class AppRecord extends Record.define({
  todoMap,
  visibilityFilter: 'All',
}) {
  get todosSorted() {
    return this.getOrCalculate('todosSorted', [this.todoMap], () => {
      return this.todoMap
        .valueSeq()
        .sortBy(todo => todo.position);
    });
  }

  get todos() {
    return this.getOrCalculate('todos', () => {
      return this.todosSorted.filter(todo => {
        if (this.visibilityFilter === 'Completed') {
          if (todo.completed) { return true; }
          return false;
        }
        if (this.visibilityFilter === 'Todo') {
          if (!todo.completed) { return true; }
          return false;
        }
        return true;
      }).toArray();
    });
  }

  get todoCount() {
    return this.getOrCalculate('itemsLeft', [this.todoMap], () => {
      return this.todoMap
        .valueSeq()
        .filter(todo => !todo.completed)
        .count();
    });
  }

  get completedCount() {
    return this.getOrCalculate('completedItemsCount', [this.todoMap], () => {
      return this.todoMap
        .valueSeq()
        .filter(todo => todo.completed)
        .count();
    });
  }

  get lastTodoPosition() {
    return this.getOrCalculate('lastTodoPosition', [this.todosSorted], () => {
      const lastTodo = this.todosSorted.last();
      if (!lastTodo) { return 0; }
      return lastTodo.position + 1;
    });
  }

  /**
   * Adds a todo and returns a new store
   * @param {string} newTodo 
   */
  addTodo(newTodo) {
    const id = uuid();
    return this.update('todoMap', todoMap =>
      todoMap.set(id, new TodoRecord({
        id,
        name: newTodo,
        position: this.lastTodoPosition,
      })));
  }

  /**
   * @param {string} todoId 
   */
  deleteTodo(todoId) {
    return this.update('todoMap', todoMap => todoMap.delete(todoId));
  }

  clearCompleted() {
    return this.update('todoMap', todoMap => {
      const completedTodos = todoMap
        .valueSeq()
        .filter(todo => todo.completed)
        .map(todo => todo.id);

      const todoMapCleared = completedTodos.reduce(
        (todoMapCleared, completedTodoId) => todoMapCleared.delete(completedTodoId),
        todoMap
      );
      return todoMapCleared;
    });
  }

  /**
   * 
   * @param {string} todoId 
   * @param {(todo: TodoRecord | undefined) => TodoRecord} update 
   */
  updateTodo(todoId, update) {
    return this.update('todoMap', todoMap =>
      todoMap.update(todoId, update));
  }

  /**
   * 
   * @param {'All' | 'Todo' | 'Completed'} visibility 
   */
  setVisibilityFilter(visibility) {
    return this.set('visibilityFilter', visibility);
  }
}

const store = Record.createStore(new AppRecord());

class NewTodo extends store.connect({
}) {

  inputRef = document.createElement('input'); // create element so its never undefined
  handleInputRef = ref => this.inputRef = ref;

  handleSubmit = e => {
    e.preventDefault();
    const newTodo = this.inputRef.value;
    if (!newTodo) { return; }
    this.setStore(store => store.addTodo(newTodo));
    this.inputRef.value = '';
  }

  render() {
    return <form className="new-todo" onSubmit={this.handleSubmit}>
      <input type="text" placeholder="What needs to be done?" ref={this.handleInputRef} />
    </form>;
  }
}

class Todo extends store.connect({
  propsExample: { id: '' },
}) {
  constructor(...params) {
    super(...params);
    this.inputId = `checkbox-${uuid()}`;
  }

  get todo() {
    const todoId = this.props.id;
    if (!todoId) { return undefined; }
    const todo = this.store.todoMap.get(todoId);
    return todo;
  }

  handleDelete = () => {
    const todoId = this.props.id;
    if (!todoId) { return; }
    this.setStore(store => store.deleteTodo(todoId));
  }

  handleTodoCheck = () => {
    const todoId = this.props.id;
    if (!todoId) { return; }
    this.setStore(store =>
      store.updateTodo(todoId, todo =>
        todo.set('completed', !todo.completed)));
  }

  render() {
    return <div className="todo">
      <input
        id={this.inputId}
        className="todo--checkbox"
        type="checkbox"
        checked={this.todo.completed}
        onChange={this.handleTodoCheck}
      />
      <label
        className="todo--label"
        htmlFor={this.inputId}
      >{this.todo.name}</label>
      <button
        className="todo--delete"
        onClick={this.handleDelete}
      >delete</button>
    </div>
  }
}

class Todos extends store.connect({
}) {
  render() {
    console.log('todos', this.store.todos.map(t => t.toJS()));
    return <div className="todo-list">
      {this.store.todos.map(todo => todo.id).map(id => <Todo key={id} id={id} />)}
    </div>
  }
}

class VisibilityFilter extends store.connect({
}) {
  handleClick(filter) {
    this.setStore(store => store.setVisibilityFilter(filter));
  }

  render() {
    return <div className="visibility-filter">
      {['All', 'Todo', 'Completed'].map((filter, key) => <button
        className={`visibility-filter__button${/*if*/ this.store.visibilityFilter === filter
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
}) {

  handleClearCompleted = () => {
    this.setStore(store => store.clearCompleted());
  }

  render() {
    return <div className="todo-app">
      <NewTodo />
      <Todos />
      <div className="footer">
        <span>{this.store.todoCount} items left</span>
        <VisibilityFilter />
        <button
          onClick={this.handleClearCompleted}
          className={`clear-completed${/*if*/ this.store.completedCount > 0
            ? ''
            : ' clear-completed--hidden'
            }`}
        >Clear completed</button>
      </div>
    </div>;
  }
}

export default App;
