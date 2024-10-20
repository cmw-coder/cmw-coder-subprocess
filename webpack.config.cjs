// @ts-check
/**@typedef {import('webpack').Configuration} WebpackConfig */

const path = require('path');
// const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');

/**@type WebpackConfig */
const buildConfig = {
  mode: 'none',
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      types: path.resolve('src/types'),
      common: path.resolve('src/common'),
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
    reviewManagerProcess: path.resolve(
      'src/processes/reviewManagerProcess/index.ts',
    ),
    similarSnippetsProcess: path.resolve(
      'src/processes/similarSnippetsProcess/index.ts',
    ),
    fileWatchProcess: path.resolve('src/processes/fileWatchProcess/index.ts'),
    fileStructureAnalysisProcess: path.resolve(
      'src/processes/fileStructureAnalysisProcess/index.ts',
    ),
  },
  output: {
    path: path.resolve('dist'),
    filename: '[name].cjs',
    libraryTarget: 'commonjs2',
  },
  // externals: [nodeExternals()],
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve('node_modules/web-tree-sitter/tree-sitter.wasm'),
          to: path.resolve('dist/tree-sitter.wasm'),
        },
        {
          from: path.resolve('public/tree-sitter/tree-sitter-c.wasm'),
          to: path.resolve('dist/public/tree-sitter/tree-sitter-c.wasm'),
        },
      ],
    }),
  ],
};

module.exports = [buildConfig];
