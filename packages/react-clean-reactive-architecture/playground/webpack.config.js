/* eslint-disable */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HotModuleReplacementPlugin = require('webpack').HotModuleReplacementPlugin;
const ProgressPlugin = require('webpack').ProgressPlugin;
const WebpackNotifierPlugin = require('webpack-notifier');

module.exports = {
  mode: 'development',
  context: path.resolve(__dirname, './src'),
  entry: {
    app: './main',
  },
  output: {
    filename: '[name].[hash].js',
    path: path.resolve(__dirname, './dist/assets'),
  },

  devServer: {
    hot: true,
    port: 3330,
    host: 'localhost',
    historyApiFallback: false,
  },

  devtool: 'inline-source-map',

  resolve: {
    extensions: ['.tsx', '.ts', '.json', '.js'],
    modules: [path.resolve(__dirname, './src'), 'node_modules'],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
      {
        test: /\.(css|scss)$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
          },
          {
            loader: 'sass-loader',
          },
        ],
      },
      {
        test: /\.(jpg|png|svg)$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: 25000,
          },
        },
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html.ejs',
      inject: 'body',
    }),
    new HotModuleReplacementPlugin(),
    new WebpackNotifierPlugin(),
    new ProgressPlugin(),
  ],
};
