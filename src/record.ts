import * as Immutable from 'immutable';

export function define<T>(recordDefault: T) {
  const BaseRecordClass: new (t?: Partial<T>) => Immutable.Record<T> = Immutable.Record(recordDefault);
  class RecordClass extends BaseRecordClass {
    static _recordDefault = recordDefault
  }
  return RecordClass as any as new (t?: Partial<T>) => Immutable.Record<T> & Readonly<T> & RecordClass;
}
