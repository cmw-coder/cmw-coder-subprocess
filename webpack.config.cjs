// @ts-check
/**@typedef {import('webpack').Configuration} WebpackConfig */

const path = require('path');
// const nodeExternals = require('webpack-node-externals');

/**@type WebpackConfig */
const buildConfig = {
  mode: 'none',
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      types: path.resolve('src/types'),
      common: path.resolve('src/common'),
      request: path.resolve('src/request'),
      processes: path.resolve('src/processes'),
    },
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: 'log',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
  target: 'node',
  entry: {
    reviewManagerProcess: path.resolve('src/processes/reviewManagerProcess/index.ts'),
    fileWatchProcess: path.resolve('src/processes/fileWatchProcess/index.ts'),
  },
  output: {
    path: path.resolve('dist'),
    filename: '[name].cjs',
    libraryTarget: 'commonjs2',
  },
  // externals: [nodeExternals()],
};

module.exports = [buildConfig];
