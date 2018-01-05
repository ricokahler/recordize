import { expect } from 'chai';
import * as Record from '../';

describe('Record', function () {
  it(`caches values with 'getOrCalculate'`, function () {

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

    expect(result0).to.be.equal(result1);
    expect(result1).to.be.equal(result2);
    expect(callCount).to.be.equal(1);

    a = new A({ a: 3 });
    const result3 = c.calculatedProperty(a, b);
    const result4 = c.calculatedProperty(a, b);
    expect(result2).to.not.be.equal(result3);
    expect(result3).to.be.equal(result4);
    expect(callCount).to.be.equal(2);

    c.simpleCalculatedProperty;
    c.simpleCalculatedProperty;
    const simpleResult = c.simpleCalculatedProperty;
    expect(simpleResult).to.be.equal(c.c + 3);
    expect(simpleCallCount).to.be.equal(1);
  });

  it(`memoizes 'hashCode's`, function () {

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

    expect(callCount).to.be.equal(1);
  });

  it(`memoizes 'equals'`, function () {

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

    expect(result0).to.be.equal(true);
    expect(result1).to.be.equal(result0);
    expect(result2).to.be.equal(result1);

    // should only be called twice: once for `recordA` and once for `recordB`
    expect(callCount).to.be.equal(2);
  });
});