import { expect } from 'chai';
import * as Record from '../src';

describe('Record', function () {
  it(
    `caches values with 'getOrCalculate'`,
    function () {

      let callCount = 0;

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

    }
  );
});