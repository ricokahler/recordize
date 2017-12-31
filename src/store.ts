import * as Immutable from 'immutable';
import * as React from 'react';

interface Adapter<Store, Props = {}, StoreAdaptedState = {}> {
  get: (store: Store, props?: Props) => StoreAdaptedState,
  set: (store: Store, value?: StoreAdaptedState, props?: Props) => Store,
  shouldUpdate?: (previousStore: Store, newStore: Store) => boolean,
}

export function createStore<Store extends Immutable.Record<any>>(initialStore: Store) {
  let currentState = initialStore;

  function sendUpdate(update: (previousStore: Store) => Store) {
    currentState = update(currentState);
    connectedComponents.forEach((adapter, component) => {
      const stateToSet = adapter.get(currentState, component.props);
      component.setState((previousState: any) => ({
        ...(previousState as any),
        ...(stateToSet as any),
      }));
    });
  }

  const connectedComponents = new Map<React.Component<any, any>, Adapter<Store, any, any>>();

  function connect<Props = {}, State = {}, StoreAdaptedState = {}>(
    adapter: Adapter<Store, Props, StoreAdaptedState>
  ) {
    class ComponentClass extends React.Component<Props, State & StoreAdaptedState> {

      constructor(props: Props, context?: any) {
        super(props, context);
        this.state = adapter.get(currentState, this.props) as any as Readonly<State & StoreAdaptedState>;
      }

      componentDidMount() {
        connectedComponents.set(this, adapter);
      }

      componentWillUnmount() {
        connectedComponents.delete(this);
      }

      setStore(updateAdaptedState: (previousState: StoreAdaptedState) => StoreAdaptedState) {
        const update = (previousStore: Store) => {
          const adaptedStoreState = adapter.get(previousStore, this.props);
          const updatedStoreState = updateAdaptedState(adaptedStoreState);
          const newStore = adapter.set(previousStore, updatedStoreState, this.props);
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
