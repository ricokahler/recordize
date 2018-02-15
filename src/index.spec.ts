import * as Record from '../';

describe('Recordize library', () => {
  it('should work as a packaged library', () => {
    expect(Record).toBeTruthy();
    expect(Record.define).toBeTruthy();
    expect(Record.createStore).toBeTruthy();
  });
});
