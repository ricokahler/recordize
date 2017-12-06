const Immutable = require('immutable');

const map = Immutable.Map();

const a = Immutable.Map({ one: 'a', two: 'b' });

const mapWithA = map.set(a, 'some value');

const b = Immutable.Map({ one: 'a', two: 'b' });

console.log(mapWithA.has(b));
