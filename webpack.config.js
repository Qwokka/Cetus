const path = require('path');

const pages = ['background', 'devtools', 'devpanel', 'popup']
const resources = ['cetus', 'init', 'content']

const generateEntryPointsViews = () => pages.reduce((store, pageName) => {
  store[pageName] = `./src/views/${pageName}.js`
  return store
}, {})

const setPath = (folderName) => path.join(__dirname, folderName);

module.exports = {
  resolve: {
    alias: {
      "~utils": setPath("src/utils"),
      "~": setPath("src/"),
    },
  },

  entry: {
    ...generateEntryPointsViews(),
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: [
          {
            loader: "babel-loader",
          },
        ],
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: "babel-loader",
          },
          {
            loader: "react-svg-loader",
            options: {
              jsx: true,
            },
          },
        ],
      },
      {
        test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: path.resolve(__dirname, "./fonts"),
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: path.resolve(__dirname, "./icons"),
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  optimization: {
    // splitChunks: {
    //   // split chart.js and moment from common vendor
    //   cacheGroups: {
    //     commons: {
    //       test: /node_modules[\\/]((?!(react-chartjs-2|chart.js|moment)).*)[\\/]/,
    //       name: 'vendor',
    //       chunks: 'all',
    //       enforce: true,
    //     },
    //     vendors: {
    //       test: /[\\/]node_modules[\\/](react-chartjs-2|chart.js)[\\/]/,
    //       name: 'chartjs',
    //       enforce: true,
    //       chunks: 'all',
    //     },
    //     moment: {
    //       test: /node_modules[\\/](moment)[\\/]/,
    //       name: 'moment',
    //       chunks: 'all',
    //       enforce: true,
    //     },
    //   }
    // }
  },
};
