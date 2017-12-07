const path = require('path');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'recordize.js',
    library: 'Recordize',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      { test: /\.ts?/, loader: 'awesome-typescript-loader' }
    ]
  },
  resolve: { extensions: ['.ts', '.js'] },
  devtool: 'source-map',
  externals: ['react', 'rxjs', 'immutable'],
};