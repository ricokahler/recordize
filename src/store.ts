import * as Immutable from 'immutable';
import { merge } from 'lodash';
import * as React from 'react';
import * as Rx from 'rxjs';

interface Adapter<Store, Props = {}, StoreAdaptedState = {}> {
  get: (store: Store, props?: Props) => StoreAdaptedState,
  set: (store: Store, value?: StoreAdaptedState, props?: Props) => Store,
}

export function createStore<Store extends Immutable.Record<any>>(t: Store) {
  const updateStream = new Rx.Subject<(previousStore: Store) => Store>();
  const stateStream = updateStream.scan((state, update) => update(state), t);

  function connect<Props = {}, State = {}, StoreAdaptedState = {}>(
    adapter: Adapter<Store, Props, StoreAdaptedState>
  ) {
    class ComponentClass extends React.Component<Props, State & StoreAdaptedState> {

      storeSubscription: Rx.Subscription | undefined;
      _updateStream = updateStream;
      stateStream = stateStream;

      constructor(props: Props, context?: any) {
        super(props, context);
        this.state = adapter.get(t, this.props) as any as Readonly<State & StoreAdaptedState>;
      }

      componentDidMount() {
        this.storeSubscription = stateStream.subscribe(store => {
          const stateToSet = adapter.get(store, this.props);
          this.setState(previousState => ({ ...(previousState as any), ...(stateToSet as any) }));
        });
      }

      componentWillUnmount() {
        if (this.storeSubscription) {
          this.storeSubscription.unsubscribe();
        }
      }

      setStore(update: (previousState: StoreAdaptedState) => StoreAdaptedState) {
        updateStream.next(previousStore => {
          const adaptedStoreState = adapter.get(previousStore, this.props);
          const updatedStoreState = update(adaptedStoreState);
          const newStore = adapter.set(previousStore, updatedStoreState, this.props);
          return newStore;
        });
      }

      setGlobalStore(update: (previousStore: Store) => Store) {
        updateStream.next(update);
      }
    }
    return ComponentClass;
  }
  return { connect, stateStream, updateStream };
}
