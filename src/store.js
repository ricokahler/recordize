"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Immutable = require("immutable");
const lodash_1 = require("lodash");
function define(recordDefault) {
    const BaseRecordClass = Immutable.Record(recordDefault);
    class RecordClass extends BaseRecordClass {
    }
    RecordClass._recordDefault = recordDefault;
    return RecordClass;
}
const Record = {
    define
};
function createGraph(TFactory) {
    const instancePointer = {
        instance: undefined,
    };
    function wrap(factory) {
        const Factory = factory;
        const cache = {};
        class Wrapped extends Factory {
            get graph() {
                return instancePointer.instance;
            }
            getOrCalculate(key, using, calculate) {
                // return calculate(using(this.graph));
                const methodCache = cache[key] || new WeakMap();
                const valueCache = methodCache.get(this) || Immutable.Map();
                const paramsGiven = using(this.graph);
                if (typeof paramsGiven !== 'object') {
                    throw new Error('params must be an object');
                }
                const lookupableParameters = (Immutable.isCollection(paramsGiven)
                    // the `using` traversal mapped directly
                    ? paramsGiven
                    // the `using` traversal mapped to an object first
                    : Immutable.fromJS(paramsGiven));
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
        return Wrapped;
    }
    const blankMap = Immutable.Map();
    function base(vRecordDefault) {
        const tRecordDefault = TFactory._recordDefault;
        const recordDefault = lodash_1.merge(vRecordDefault, tRecordDefault);
        const Factory = Immutable.Record(recordDefault);
        class GraphBase extends Factory {
            constructor(...args) {
                super(...args);
                instancePointer.instance = this;
            }
        }
        const persistentChanges = [
            'set', 'delete', 'update'
        ];
        persistentChanges.forEach(method => {
            GraphBase.prototype[method] = function (...args) {
                const result = Factory.prototype[method].call(this, ...args);
                instancePointer.instance = result;
                return result;
            };
        });
        return GraphBase;
    }
    return { wrap, base };
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
class GradingSystemRecord extends Record.define({}) {
}
class CourseRecord extends Record.define({}) {
}
class AppRecord extends Record.define({
    user: new UserRecord(),
}) {
}
const graph = createGraph(AppRecord);
class Course extends graph.wrap(CourseRecord) {
    get letterGrade() {
        return this.getOrCalculate('letterGrade', g => ({ user: g.user, t: g.user }), ({ user, t }) => {
            console.log('letter grade calculated');
            return user.a;
        });
    }
}
class Final extends graph.base({
    course: new Course(),
}) {
    method() {
    }
}
const final = new Final();
console.log(final.course.letterGrade);
const newFinal = new Final().update('user', user => user.set('a', 'something else')).update('user', user => user.set('a', 'something else else'));
console.log(newFinal.user.a);
console.log(newFinal.course.letterGrade);
console.log(newFinal.course.letterGrade);
console.log(newFinal.course.letterGrade);
