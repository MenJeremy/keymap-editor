const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { VueLoaderPlugin } = require('vue-loader')
const webpack = require('webpack')

module.exports = {
  entry: {
    app: './main.js'
  },
  devServer: {
    contentBase: './dist',
    liveReload: false,
    hot: false
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      }
    ]
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      ENABLE_LOCAL: true,
      ENABLE_GITHUB: true,
      GITHUB_APP_NAME: 'Adv360Pro',
      API_BASE_URL: 'https://keymap.herokuapp.com/',
      APP_BASE_URL: 'http://localhost'
    }),
    new HtmlWebpackPlugin({ template: 'index.html' }),
    new VueLoaderPlugin()
  ]
}
