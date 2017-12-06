"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Immutable = require("immutable");
function Recordize(recordDefault) {
    const RecordClass = Immutable.Record(recordDefault);
    const clazz = class extends RecordClass {
        constructor(props) {
            super(props);
        }
    };
    return clazz;
}
exports.Recordize = Recordize;
