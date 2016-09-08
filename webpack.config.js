module.exports = {
  entry: './src/index.js',
  output: {
    path: __dirname,
    filename: 'bundle.js',
    library: 'logic-machine',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    loaders: [
      { test: /\.js/, loader: 'babel', query: { presets: ['es2015'], plugins: ['add-module-exports'] } }
    ]
  }
};
