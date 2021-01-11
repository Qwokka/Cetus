const path = require('path');
const merge = require('webpack-merge');
const webpack = require('webpack');
const fs = require('fs');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const common = require('./webpack.config.js');

console.log(__dirname)
module.exports = merge(common, {
  mode: 'development',
  devtool: 'source-map',

  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'build/'),
    publicPath: 'https://dev.cetus.com:3000/',
  },

  // Generate sertificates + create custom domain name (Firefox use only https to load local bundle)
  // https://www.sarthakbatra.com/blog/running-react-with-https-on-custom-local-domain/
  devServer: {
    https: true,
    host: 'dev.cetus.com',
    contentBase: path.resolve(__dirname, 'build/'),
    publicPath: '/',
    port: 3000,
    hotOnly: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    disableHostCheck: true,

  },

  plugins: [
    new BundleAnalyzerPlugin({
      openAnalyzer: false
    }),
    new webpack.EnvironmentPlugin({
      currentMode: 'dev'
    }),
  ]
});