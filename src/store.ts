import * as Immutable from 'immutable';
import * as React from 'react';
import * as Rx from 'rxjs';

interface Adapter<Store, Props = {}, StoreAdaptedState = {}> {
  get: (store: Store, props?: Props) => StoreAdaptedState,
  set: (store: Store, value?: StoreAdaptedState, props?: Props) => Store,
  shouldUpdate?: (previousStore: Store, newStore: Store) => boolean,
}

export function createStore<Store extends Immutable.Record<any>>(initialStore: Store) {
  const updateStream = new Rx.Subject<(previousStore: Store) => Store>();

  let currentState = initialStore;

  const stateStream = updateStream.scan((store, update) => {
    const state = update(store);
    currentState = state;
    return state;
  }, initialStore).share().distinctUntilChanged();

  function connect<Props = {}, State = {}, StoreAdaptedState = {}>(
    adapter: Adapter<Store, Props, StoreAdaptedState>
  ) {
    class ComponentClass extends React.Component<Props, State & StoreAdaptedState> {

      private _storeSubscription: Rx.Subscription | undefined;
      private _updateStream = updateStream;
      stateStream = stateStream;

      constructor(props: Props, context?: any) {
        super(props, context);
        this.state = adapter.get(currentState, this.props) as any as Readonly<State & StoreAdaptedState>;
      }

      componentDidMount() {
        if (!this._storeSubscription) {
          this._storeSubscription = (stateStream
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
        if (this._storeSubscription) {
          this._storeSubscription.unsubscribe();
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
