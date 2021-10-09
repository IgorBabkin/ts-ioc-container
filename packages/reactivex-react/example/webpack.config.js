/* eslint-disable */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HotModuleReplacementPlugin = require('webpack').HotModuleReplacementPlugin;
const ProgressPlugin = require('webpack').ProgressPlugin;
const WebpackNotifierPlugin = require('webpack-notifier');

module.exports = {
    mode: 'development',
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
    devServer: {
        hot: true,
        port: 3330,
        host: 'localhost',
        historyApiFallback: false,
    },

    devtool: 'inline-source-map',

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
