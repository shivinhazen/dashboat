/* eslint-disable linebreak-style */
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    custom: './src/js/custom.js',
    admin: './src/js/admin.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'public/js'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ['*.bundle.js'],
    }),
  ],
  devServer: {
    static: path.join(__dirname, 'public'),
    port: 5000,
    hot: true,
    open: true,
  },
  devtool: 'source-map',
};
