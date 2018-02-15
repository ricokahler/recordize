import * as Immutable from 'immutable';
import * as React from 'react';
import { oneLine } from 'common-tags';

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

interface ConnectionOptions<Store, Props = {}, OptionalProps = {}, State = {}, Scope = Store> {
  scope?: (store: Store) => Scope,
  descope?: (store: Store, scope: Scope) => Store,
  initialState?: State,
  propTypes?: (types: TypeDefiner) => V<Props>,
  optionalPropTypes?: (types: TypeDefiner) => V<OptionalProps>
  propsExample?: Props,
}

interface ComponentGroup<Store, Scope> {
  currentScope: Scope,
  scope: (store: Store) => Scope,
  components: Map<React.Component<any, any>, ConnectionOptions<any, any, any, any, any>>,
}

export interface Equatable {
  hashCode(): number,
  equals(other: any): boolean,
}

/**
 * a very simple class to represent a tuple of properties needed to make a modification to
 * `componentGroups`. Classes are generally faster than array tuples.
 */
class ModificationTuple<Store, Scope extends Equatable> {
  constructor(
    public hashToDelete: number,
    public hashToSet: number,
    public newScope: Scope,
    public componentGroup: ComponentGroup<Store, Equatable>,
  ) { }
}

export function createStore<Store extends Immutable.Record<any>>(initialStore: Store) {
  let currentStore = initialStore;
  const componentGroups = new Map<number, ComponentGroup<Store, Equatable>>();

  function sendUpdate(update: (previousStore: Store) => Store) {
    const previousStore = currentStore
    currentStore = update(previousStore);

    // create a list of modifications that we'll use after we iterate through the `componentGroups`
    const modifications: Array<ModificationTuple<Store, Equatable>> = [];

    for (let [scopeHash, componentGroup] of componentGroups) {
      const previousScope = componentGroup.scope(previousStore);
      const newScope = componentGroup.scope(currentStore);
      // early return optimization
      if (previousScope.equals(newScope)) { continue; }

      // call component setState if no early return
      for (let [component, connectionOptions] of componentGroup.components) {
        component.forceUpdate();
      }

      // push modification
      modifications.push(new ModificationTuple(
        scopeHash,
        newScope.hashCode(),
        newScope,
        componentGroup
      ));
    }

    for (let modification of modifications) {
      componentGroups.delete(modification.hashToDelete);
      modification.componentGroup.currentScope = modification.newScope;
      componentGroups.set(modification.hashToSet, modification.componentGroup);
    }
  }

  function connect<Props = {}, OptionalProps = {}, State = {}, Scope extends Equatable = Store>(
    connectionOptions: ConnectionOptions<Store, Props, OptionalProps, State, Scope>
  ) {
    class ComponentClass extends React.Component<Props & Partial<OptionalProps>, State> {

      constructor(props: Props & Partial<OptionalProps>, context?: any) {
        super(props, context);
        const getScope = connectionOptions.scope || ((store: Store) => store as any as Scope);
        const scope = getScope(currentStore);
        this.state = {
          ...((connectionOptions.initialState || {}) as any),
        };
      }

      get store() {
        const getScope = connectionOptions.scope || ((store: Store) => store as any as Scope);
        const scope = getScope(currentStore);
        return scope;
      }

      componentDidMount() {
        const getScope = connectionOptions.scope || ((store: Store) => store as any as Scope);
        const scope = getScope(currentStore);
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
          components: new Map<React.Component<any, any>, ConnectionOptions<any, any, any, any, any>>(),
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
        const scope = getScope(currentStore);
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
        if (componentGroup.components.size === 0) {
          componentGroups.delete(scopeHashCode);
        }
      }

      setStore(updateScope: (previousState: Scope) => Scope) {
        const update = (previousStore: Store) => {
          const getScope = connectionOptions.scope || ((store: Store) => store as any as Scope);
          const setScope = connectionOptions.descope || ((store: any, scope: any) => scope as Store);

          const scope = getScope(previousStore);
          const updatedScope = updateScope(scope);
          const newStore = setScope(previousStore, updatedScope);
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
  return { connect, componentGroups, sendUpdate, current: () => currentStore };
}
