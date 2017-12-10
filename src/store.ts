import * as Immutable from 'immutable';
import { merge } from 'lodash';
import * as React from 'react';
import * as Rx from 'rxjs';

type V<T, A> = {
  [K in keyof A]: {
    get: (t: T) => A[K],
    set: (t: T, value?: any) => T
  }
};

export function createStore<T extends Immutable.Record<any>>(t: T) {
  const updateStream = new Rx.Subject<(previousStore: T) => T>();
  const stateStream = updateStream.scan((state, update) => update(state), t);
  function connect<A extends any>(mapping: V<T, A>) {
    class ComponentClass<P, S> extends React.Component<P, A & S> {

      storeSubscription: Rx.Subscription | undefined;
      updateStream = updateStream;
      stateStream = stateStream;

      constructor(props: P, context?: any) {
        super(props, context);
        const defaultStateFromStore = Object.entries(mapping).reduce((stateToSet, [key, pathGetter]) => {
          stateToSet[key] = pathGetter.get(t)
          return stateToSet;
        }, {} as A);
        this.state = Object.freeze(merge(defaultStateFromStore, this.defaultState()));
      }

      componentDidMount() {
        this.storeSubscription = stateStream.subscribe(store => {
          const stateToSet = Object.entries(mapping).reduce((stateFromStore, [key, pathGetter]) => {
            stateFromStore[key] = pathGetter.get(store)
            return stateFromStore;
          }, {} as A);
          this.setState(previousState => ({ ...(previousState as any), ...(stateToSet as any) }))
        });
      }

      componentWillUnmount() {
        if (this.storeSubscription) {
          this.storeSubscription.unsubscribe();
        }
      }

      defaultState(): S | undefined {
        return undefined;
      };

      sendUpdate(update: (previousState: A) => A) {
        updateStream.next(previousStore => {
          const ps = Object.entries(mapping).reduce((stateToSet, [key, pathGetter]) => {
            stateToSet[key] = pathGetter.get(previousStore)
            return stateToSet;
          }, {} as A);
          const s = update(ps);
          const newStore = Object.entries(s).reduce((newStore, [_key, newValue]) => {
            const key = _key as keyof A;
            const path = mapping[key];
            return path.set(newStore, newValue)
          }, previousStore);
          return newStore;
        });
      }

      sendGlobalUpdate(update: (previousStore: T) => T) {
        updateStream.next(update);
      }
    }
    return ComponentClass;
  }
  return { connect, stateStream, updateStream };
}
