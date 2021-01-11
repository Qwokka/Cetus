const path = require('path');
const merge = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
// const ImageminPlugin = require('imagemin-webpack-plugin').default
const { EnvironmentPlugin } = require('webpack')

const common = require('./webpack.config.js');

const pages = ['background', 'devtools', 'devpanel', 'popup']
const resources = ['cetus', 'init', 'content']

module.exports = merge(common, {
  mode: 'production',

  module: {
    rules: [
      
    ]
  },

  output: {
    filename: (chunkData) => {
      const chunkName = chunkData.chunk.name;
      if (pages.indexOf(chunkName) !== -1) {
        return "extension/[name].js";
      } else if (resources.indexOf(chunkName) !== -1) {
        return "content/[name].js";
      } else {
        return "[name].js";
      }
    },
  },

  // optimization: {
  //   minimizer: [new TerserPlugin({
  //     test: /\.js(\?.*)?$/i,
  //   })],
  // },
  
  plugins: [
    new CopyPlugin([
      { from: path.join(__dirname, '/src/assets'), to: path.join(__dirname, '/dist/') },
      { from: path.join(__dirname, './manifest.json'), to: path.join(__dirname, '/dist/') },
      { from: path.join(__dirname, './src/resources'), to: path.join(__dirname, '/dist/content') },
      { from: path.join(__dirname, './src/thirdparty'), to: path.join(__dirname, '/dist/content/thirdparty') },
    ]),
    new EnvironmentPlugin({
      currentMode: 'prod'
    }),
    // new ImageminPlugin({ test: /\.(jpe?g|png|gif|svg)$/i }),
  ]
});