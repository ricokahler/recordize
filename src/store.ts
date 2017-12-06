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
    type Parameter = Immutable.Record<any> | Immutable.Map<string, any>;
    type MethodCache = WeakMap<Wrapped, Immutable.Map<Parameter, any>>;
    const cache: { [key: string]: MethodCache | undefined } = {};

    const EmptyRecord = Immutable.Record({});

    class Wrapped extends Factory {
      graph = t;

      getOrCalculate<R, U extends { [key: string]: Immutable.Record<any> } | Immutable.Record<any>>(
        key: string,
        using: (t: T) => U,
        calculate: (u: U) => R
      ) {

        const methodCache = cache[key] || new WeakMap<Wrapped, Immutable.Map<Parameter, any>>();
        const valueCache = methodCache.get(this) || Immutable.Map<Parameter, any>();
        const paramsGiven = using(this.graph);
        if (typeof paramsGiven !== 'object') {
          throw new Error('params must be an object');
        }
        const lookupableParameters = (/*if*/ Immutable.isCollection(paramsGiven)
          // the `using` traversal mapped directly
          ? paramsGiven as Immutable.Record<any>
          // the `using` traversal mapped to an object first
          : Immutable.fromJS(paramsGiven) as Immutable.Map<string, any>
        );

        if (valueCache.has(lookupableParameters)) {
          return valueCache.get(lookupableParameters);
        }

        const value = calculate(paramsGiven);
        const newValueCache = valueCache.set(lookupableParameters, value);
        methodCache.set(this, newValueCache);
        cache[key] = methodCache;
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
        console.log('letter grade calculated')
        return user.a;
      }
    );
  }
}

class Final extends Record.define({
  course: new Course()
}) { }

console.log(new Final().course.letterGrade);
console.log(new Final().course.letterGrade);
console.log(new Final().course.letterGrade);
console.log(new Final().course.letterGrade);