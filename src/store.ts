import * as Immutable from 'immutable';
import * as React from 'react';
import { oneLine } from 'common-tags';

type Optional<T> = T | undefined;
interface TypeCapture<T> { }
type V<Props> = {[K in keyof Props]: TypeCapture<Props[K]>};
interface TypeDefiner {
  any: TypeCapture<any>,
  array: TypeCapture<Array<any>>,
  arrayOf: <R>(typeCapture: TypeCapture<R>) => TypeCapture<R[]>,
  bool: TypeCapture<boolean>,
  func: TypeCapture<Function>,
  number: TypeCapture<number>,
  object: TypeCapture<object>,
  string: TypeCapture<string>,
  symbol: TypeCapture<symbol>,
  node: TypeCapture<any>, // TODO: better typings
  element: TypeCapture<any>, // TODO: better typings
  instanceOf: <R>(constructor: new (...params: any[]) => R) => TypeCapture<R>,
  // oneOf: <A, B, C, D, E>(typeToQuery: V<A>) => PropType<A>,
  shape: <R>(v: V<R>) => TypeCapture<R>, // TODO: allow for optional types here
  typeOf: <R>(typeToQuery: R) => TypeCapture<R>,
}

type ReactProps<T> = Readonly<{ children?: React.ReactNode; }> & Readonly<T>;

interface ConnectionOptions<Store, StateFromStore, Props, OptionalProps, StateFromComponent, Scope> {
  scope?: (store: Store) => Scope,
  descope?: (store: Store, scope: Scope) => Store,
  get: (scope: Scope, props: ReactProps<Props & Partial<OptionalProps>>) => StateFromStore,
  set: (scope: Scope, value: any, props: ReactProps<Props & Partial<OptionalProps>>) => Scope,
  initialState?: StateFromComponent,
  propTypes?: (types: TypeDefiner) => V<Props>,
  optionalPropTypes?: (types: TypeDefiner) => V<OptionalProps>
  propsExample?: Props,
}

interface ComponentGroup<Store, Scope> {
  currentScope: Scope,
  scope: (store: Store) => Scope,
  components: Map<React.Component<any, any>, ConnectionOptions<any, any, any, any, any, any>>,
}

type ScopeHash = number;

interface Equatable {
  hashCode(): number,
  equals(other: any): boolean,
}

export function createStore<Store extends Immutable.Record<any>>(initialStore: Store) {
  let currentState = initialStore;
  const componentGroups = new Map<ScopeHash, ComponentGroup<Store, Equatable>>();

  function sendUpdate(update: (previousStore: Store) => Store) {
    const previousState = currentState
    currentState = update(previousState);

    // clone the component groups so that we can delete and add new ones
    const currentComponentGroups = Array.from(componentGroups.entries());
    for (let [scopeHash, componentGroup] of currentComponentGroups) {
      const previousScope = componentGroup.scope(previousState);
      const newScope = componentGroup.scope(currentState);
      // early return optimization
      if (previousScope.equals(newScope)) { continue; }

      // call component setState if no early return
      for (let [component, connectionOptions] of componentGroup.components) {
        const adaptedState = connectionOptions.get(newScope, component.props);
        component.setState((previousState: any) => ({
          ...(previousState || {}),
          ...(adaptedState || {}),
        }));
      }

      // update scope
      componentGroup.currentScope = newScope;
      // it's okay to delete the scopeHash and re-assign it because we cloned the state of the
      // componentGroups before we made modifications
      componentGroups.delete(scopeHash);
      componentGroups.set(newScope.hashCode(), componentGroup);
    }
  }

  function connect<StateFromStore, Props, OptionalProps, StateFromComponent, Scope extends Equatable = Store>(
    connectionOptions: ConnectionOptions<Store, StateFromStore, Props, OptionalProps, StateFromComponent, Scope>
  ) {
    class ComponentClass extends React.Component<Props & Partial<OptionalProps>, StateFromComponent & StateFromStore> {

      constructor(props: Props & Partial<OptionalProps>, context?: any) {
        super(props, context);
        const getScope = connectionOptions.scope || ((store: Store) => store as any as Scope);
        const scope = getScope(currentState);
        const thisProps = this.props;
        this.state = {
          ...(connectionOptions.get(scope, this.props) as any),
          ...(connectionOptions.initialState || {}),
        };
      }

      componentDidMount() {
        const getScope = connectionOptions.scope || ((store: Store) => store as any as Scope);
        const scope = getScope(currentState);
        if (typeof scope.hashCode !== 'function') {
          throw new Error(oneLine`
            Object chosen as 'scope' does not have a 'hashCode' function. Ensure the object is
            immutable and has this method.
          `);
        }
        const scopeHashCode = scope.hashCode();
        const componentGroup = componentGroups.get(scopeHashCode) || {
          currentScope: scope,
          scope: connectionOptions.scope || ((store: Store) => store as any),
          components: new Map<React.Component<any, any>, ConnectionOptions<any, any, any, any, any, any>>(),
        };
        if (!componentGroup.currentScope.equals(scope)) {
          // TODO: add some sort of re-hashing mechanism
          console.warn(oneLine`
            Hash collision from Recordize. There is nothing to do to fix this warning. Please report
            this to the repo: https://github.com/ricokahler/recordize if you see this warning
            frequently.
          `);
        }
        componentGroup.components.set(this, connectionOptions);
        componentGroups.set(scopeHashCode, componentGroup);
      }

      componentWillUnmount() {
        const getScope = connectionOptions.scope || ((store: Store) => store as any as Scope);
        const scope = getScope(currentState);
        const scopeHashCode = scope.hashCode();
        const componentGroup = componentGroups.get(scopeHashCode);
        if (!componentGroup) { return; }
        if (!componentGroup.currentScope.equals(scope)) {
          // TODO: add some sort of re-hashing mechanism
          console.warn(oneLine`
            Hash collision from Recordize. There is nothing to do to fix this warning. Please report
            this to the repo: https://github.com/ricokahler/recordize if you see this warning
            frequently.
          `);
        }
        componentGroup.components.delete(this);
      }

      setStore(updateAdaptedState: (previousState: StateFromStore) => StateFromStore) {
        const update = (previousStore: Store) => {
          const getScope = connectionOptions.scope || ((store: Store) => store as any as Scope);
          const setScope = connectionOptions.descope || ((store: any, scope: any) => scope as Store);

          const scope = getScope(previousStore);
          const adaptedStoreState = connectionOptions.get(scope, this.props);
          const updatedStoreState = updateAdaptedState(adaptedStoreState);
          const newScope = connectionOptions.set(scope, updatedStoreState, this.props);
          const newStore = setScope(previousStore, newScope);
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
  return { connect, componentGroups };
}
