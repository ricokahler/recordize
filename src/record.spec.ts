import * as Record from '../';

describe('Record', () => {
  it(`caches values with 'getOrCalculate'`, () => {

    let callCount = 0;
    let simpleCallCount = 0;

    class A extends Record.define({
      a: 5,
    }) { }

    class B extends Record.define({
      b: 6,
    }) { }

    class C extends Record.define({
      c: 7,
    }) {
      calculatedProperty(a: A, b: B) {
        return this.getOrCalculate('calculatedProperty', [a, b, this], () => {
          callCount += 1;
          return this.c + a.a + b.b;
        });
      }

      get simpleCalculatedProperty() {
        return this.getOrCalculate('simple', () => {
          simpleCallCount += 1;
          return this.c + 3;
        });
      }
    }

    let a = new A();
    const b = new B();
    const c = new C();

    const result0 = c.calculatedProperty(a, b);
    const result1 = c.calculatedProperty(a, b);
    const result2 = c.calculatedProperty(a, b);

    expect(result0).toBe(result1);
    expect(result1).toBe(result2);
    expect(callCount).toBe(1);

    a = new A({ a: 3 });
    const result3 = c.calculatedProperty(a, b);
    const result4 = c.calculatedProperty(a, b);
    expect(result2).toBe(result3);
    expect(result3).toBe(result4);
    expect(callCount).toBe(2);

    c.simpleCalculatedProperty;
    c.simpleCalculatedProperty;
    const simpleResult = c.simpleCalculatedProperty;
    expect(simpleResult).toBe(c.c + 3);
    expect(simpleCallCount).toBe(1);
  });

  it(`memoizes 'hashCode's`, () => {

    let callCount = 0;

    class FooRecord extends Record.define({
      foo: 'some foo',
      bar: 5,
      get prop() {
        callCount += 1;
        return 'test';
      }
    }) { }

    const record = new FooRecord();
    record.hashCode();
    record.hashCode();
    record.hashCode();

    expect(callCount).toBe(1);
  });

  it(`memoizes 'equals'`, () => {

    let callCount = 0;

    class FooRecord extends Record.define({
      foo: 'some foo',
      bar: 5,
      get prop() {
        callCount += 1;
        return 'test';
      }
    }) { }

    const recordA = new FooRecord();
    const recordB = new FooRecord();
    const result0 = recordA.equals(recordB);
    const result1 = recordA.equals(recordB);
    const result2 = recordA.equals(recordB);

    expect(result0).toBe(true);
    expect(result1).toBe(result0);
    expect(result2).toBe(result1);

    // should only be called twice: once for `recordA` and once for `recordB`
    expect(callCount).toBe(2);
  });

  it(`returns the 'recordDefault'`, () => {
    const recordDefault = {
      foo: 'some foo',
      bar: 'some bar',
    };

    class FooRecord extends Record.define(recordDefault) { }

    expect(FooRecord.recordDefault).toEqual(recordDefault);
  });
});
