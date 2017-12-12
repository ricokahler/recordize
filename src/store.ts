import * as Immutable from 'immutable';
import { merge, isEqual } from 'lodash';
import * as React from 'react';
import * as Rx from 'rxjs';

interface Adapter<Store, Props = {}, StoreAdaptedState = {}> {
  get: (store: Store, props?: Props) => StoreAdaptedState,
  set: (store: Store, value?: StoreAdaptedState, props?: Props) => Store,
}

export function createStore<Store extends Immutable.Record<any>>(initialStore: Store) {
  const updateStream = new Rx.Subject<(previousStore: Store) => Store>();

  let currentState = initialStore;

  const stateStream = updateStream.scan((store, update) => {
    const state = update(store);
    currentState = state;
    return state;
  }, initialStore).share();

  function connect<Props = {}, State = {}, StoreAdaptedState = {}>(
    adapter: Adapter<Store, Props, StoreAdaptedState>
  ) {
    class ComponentClass extends React.Component<Props, State & StoreAdaptedState> {

      storeSubscription: Rx.Subscription | undefined;

      constructor(props: Props, context?: any) {
        super(props, context);
        this.state = adapter.get(currentState, this.props) as any as Readonly<State & StoreAdaptedState>;
      }

      componentDidMount() {
        if (!this.storeSubscription) {
          this.storeSubscription = (stateStream
            .subscribe(store => {
              const stateToSet = adapter.get(store, this.props);
              this.setState(previousState => ({
                ...(previousState as any),
                ...(stateToSet as any),
              }));
            })
          );
        }
      }

      componentWillUnmount() {
        if (this.storeSubscription) {
          this.storeSubscription.unsubscribe();
        }
      }

      setStore(updateAdaptedState: (previousState: StoreAdaptedState) => StoreAdaptedState) {
        const update = (previousStore: Store) => {
          const adaptedStoreState = adapter.get(previousStore, this.props);
          const updatedStoreState = updateAdaptedState(adaptedStoreState);
          const newStore = adapter.set(previousStore, updatedStoreState, this.props);
          return newStore;
        };
        updateStream.next(update);
      }

      setGlobalStore(update: (previousStore: Store) => Store) {
        updateStream.next(update);
      }
    }
    return ComponentClass;
  }
  return { connect, stateStream, updateStream };
}
