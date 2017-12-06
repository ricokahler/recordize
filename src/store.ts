import * as Immutable from 'immutable';

function define<T>(recordDefault: T) {
  const BaseRecordClass: new (t?: T) => Immutable.Record<T> = Immutable.Record(recordDefault);
  class RecordClass extends BaseRecordClass {

  }
  return RecordClass as new (t?: T) => Immutable.Record<T> & Readonly<T> & RecordClass;
}

const Record = {
  define
};

function createGraph<T>(t: T) {
  function wrap<V>(factory: new (v?: V) => Immutable.Record<V> & Readonly<V>) {
    const Factory = factory as new (v?: V) => Immutable.Record<V>;

    // memo, given an instance will return another memo.
    // if you get that memo the params, it will return the value
    const memo = new WeakMap<Wrapped, WeakMap<any, any>>();

    const EmptyRecord = Immutable.Record({});

    class Wrapped extends Factory {
      graph = t;

      getOrCalculate<R, U extends { [key: string]: Immutable.Record<any> } | Immutable.Record<any>>(
        key: string,
        using: (t: T) => U,
        calculate: (u: U) => R
      ) {

        const paramsMemo = memo.get(this) || new WeakMap<any, any>();
        const paramsGiven = using(this.graph);
        if (typeof paramsGiven !== 'object') {
          throw new Error('params must be an object');
        }
        // const parameters = (/*if*/ Immutable.isCollection(paramsGiven)
        //   // the `using` traversal mapped directly
        //   ? paramsGiven
        //   // the `using` traversal mapped to an object first
        //   : Object.keys(paramsGiven).reduce((immutableParams, key) => {
        //     return immutableParams;
        //   }, {})
        // );

        if (paramsMemo.has(paramsGiven)) {
          return paramsMemo.get(paramsGiven);
        }

        const value = calculate(paramsGiven);

        paramsMemo.set(paramsGiven, value);

        return value;
      }
    }

    return Wrapped as new (v?: V) => Immutable.Record<V> & Readonly<V> & Wrapped;
  }

  return { wrap };
}

class UserRecord extends Record.define({ a: 'something' }) {
  method() {

  }
}

class SemesterRecord extends Record.define({}) {
  get gpa() {
    return undefined;
  }
}

class GradingSystemRecord extends Record.define({

}) { }

class CourseRecord extends Record.define({}) {
}

class AppRecord extends Record.define({
  user: new UserRecord(),

}) {
}

const graph = createGraph(new AppRecord());

class Course extends graph.wrap(CourseRecord) {
  get letterGrade() {
    return this.getOrCalculate('letterGrade', g => ({ user: g.user, t: g.user }),
      ({ user, t }) => {
        return user.a;
      }
    );
  }
}

class Final extends Record.define({
  course: new Course()
}) { }

console.log(new Final().course.letterGrade);