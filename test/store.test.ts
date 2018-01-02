import { expect } from 'chai';
import { oneLine } from 'common-tags';

describe('Store', function () {
  it(
    `adds a component to the 'componentGroups' on 'componentDidMount'`
  );
  it(
    `removes a component from the 'componentGroups' on 'componentWillUnmount'`
  );
  it(
    `sets the correct initial state for a component considering the 'currentState'`
  );
  it(
    `applies the 'initialComponentState' connection option when present`,
  );
  it(
    `sends an update when 'setStore' is called on a component`,
  );
  it(
    `sends an update when 'setGlobalStore' is called on a component`
  );
  it(
    oneLine`
      updates only the respective components when the 'select' component option has been configured
    `,
  );
  it(
    `updates the 'selection' in the map of componentGroups`
  )
});