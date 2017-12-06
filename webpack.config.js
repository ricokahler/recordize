module.exports = {
  entry: './src/store.tsx',
  output: {
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {test: /\.tsx?/, loader: 'awesome-typescript-loader'}
    ]
  },
  devtool: 'source-map'
};