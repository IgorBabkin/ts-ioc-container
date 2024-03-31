/* eslint-disable */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ProgressPlugin = require('webpack').ProgressPlugin;

module.exports = {
  mode: 'production',
  context: path.resolve(__dirname),

  entry: './main.tsx',

  output: {
    filename: '[name].[hash].js',
    path: path.resolve(__dirname, './dist/assets'),
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.json', '.js'],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html.ejs',
      inject: 'body',
    }),
    new ProgressPlugin(),
  ],
};
