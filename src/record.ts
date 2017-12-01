import * as Immutable from 'immutable';

export function Recordize<RecordDefault>(recordDefault: RecordDefault) {
  const RecordClass = Immutable.Record(recordDefault);

  const clazz = class extends (RecordClass as any) {
    constructor(props: any) {
      super(props);
    }
  }

  return clazz;
}