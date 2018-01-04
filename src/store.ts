import * as Immutable from 'immutable';
import * as React from 'react';

let a: object = {};

type Optional<T> = T | undefined;
interface TypeCapture<T> { }
type V<Props> = {[K in keyof Props]: TypeCapture<Props[K]>};
interface TypeDefiner {
  any: TypeCapture<any>,
  array: TypeCapture<Array<any>>,
  bool: TypeCapture<boolean>,
  func: TypeCapture<Function>,
  number: TypeCapture<number>,
  object: TypeCapture<object>,
  string: TypeCapture<string>,
  symbol: TypeCapture<symbol>,
  node: TypeCapture<any>, // TODO: better typings
  element: TypeCapture<any>, // TODO
  instanceOf: <R>(constructor: new (...params: any[]) => R) => TypeCapture<R>,
  // oneOf: <A, B, C, D, E>(typeToQuery: V<A>) => PropType<A>,
  shape: <R>(definer: (types: TypeDefiner) => V<R>) => TypeCapture<R>,
  typeOf: <R>(typeToQuery: R) => TypeCapture<R>,
}

interface ConnectionOptions<Store, StateFromStore, Props, StateFromComponent, Selection> {
  select?: (store: Store) => Selection,
  deselect?: (store: Store, selection: Selection) => Store,
  get: (selection: Selection, props?: Props) => StateFromStore,
  set: (selection: Selection, value?: any, props?: Props) => Selection,
  initialState?: StateFromComponent,
  propTypes?: (types: TypeDefiner) => V<Props>,
  // optionalPropTypes?: (types: TypeDefiner) => V<Props>
  propExample?: Props,
}

interface ComponentGroup<Store, Selection> {
  selector: (store: Store) => Selection,
  components: Map<React.Component<any, any>, ConnectionOptions<any, any, any, any, any>>,
}

export function createStore<Store extends Immutable.Record<any>>(initialStore: Store) {
  let currentState = initialStore;
  const componentGroups = new Map<any, ComponentGroup<Store, any>>();

  function sendUpdate(update: (previousStore: Store) => Store) {
    const previousState = currentState
    currentState = update(previousState);

    for (let [selection, componentGroup] of componentGroups) {
      const previousSelection = componentGroup.selector(previousState);
      const newSelection = componentGroup.selector(currentState);
      // early return immutable optimization
      if (previousSelection !== selection) { continue; }

      // call component setState if no early return
      for (let [component, connectionOptions] of componentGroup.components) {
        const adaptedState = connectionOptions.get(newSelection, component.props);
        component.setState((previousState: any) => ({
          ...previousState,
          ...adaptedState,
        }));
      }

      // update selection
      componentGroups.delete(selection);
      componentGroups.set(newSelection, componentGroup);
    }
  }

  function connect<StateFromStore, Props, StateFromComponent, Selection = Store>(
    connectionOptions: ConnectionOptions<Store, StateFromStore, Props, StateFromComponent, Selection>
  ) {
    class ComponentClass extends React.Component<Props, StateFromComponent & StateFromStore> {

      constructor(props: Props, context?: any) {
        super(props, context);
        const select = connectionOptions.select || ((store: Store) => store as any);
        const selection = select(currentState);
        this.state = {
          ...(connectionOptions.get(selection, this.props) as any),
          ...(connectionOptions.initialState || {}),
        };
      }

      componentDidMount() {
        const select = connectionOptions.select || ((store: Store) => store as any);
        const selection = select(currentState);
        const componentGroup = componentGroups.get(selection) || {
          selector: connectionOptions.select || ((store: Store) => store as any),
          components: new Map<React.Component<any, any>, ConnectionOptions<any, any, any, any, any>>(),
        };
        componentGroup.components.set(this, connectionOptions);
        componentGroups.set(selection, componentGroup);
      }

      componentWillUnmount() {
        const select = connectionOptions.select || ((store: Store) => store as any);
        const selection = select(currentState);
        const componentGroup = componentGroups.get(selection);
        if (!componentGroup) { return; }
        componentGroup.components.delete(this);
      }

      setStore(updateAdaptedState: (previousState: StateFromStore) => StateFromStore) {
        const update = (previousStore: Store) => {
          const select = connectionOptions.select || ((store: Store) => store as any);
          const deselect = connectionOptions.deselect || ((selection: any) => selection as Store);

          const selection = select(previousStore);
          const adaptedStoreState = connectionOptions.get(selection, this.props);
          const updatedStoreState = updateAdaptedState(adaptedStoreState);
          const newSelection = connectionOptions.set(selection, updatedStoreState, this.props);
          const newStore = deselect(previousStore, newSelection);
          return newStore;
        };
        sendUpdate(update);
      }

      setGlobalStore(update: (previousStore: Store) => Store) {
        sendUpdate(update);
      }
    }
    return ComponentClass;
  }
  return { connect };
}
