const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanPlugin = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const PATHS = {
  app: path.join(__dirname, 'app'),
  build: path.join(__dirname, 'build'),
  style: path.join(__dirname, 'app/main.css')
};

const TARGET = process.env.npm_lifecycle_event;

const common = {
  // Entry accepts a path or an object of entries. We'll be using the
  // latter form given it's convenient with more complex configurations.
  entry: {
    app: PATHS.app,
    style: PATHS.style
  },
  resolve: {
    extensions: ['', '.js', '.jsx']
  },
  output: {
    path: PATHS.build,
    filename: '[name].js'
  },
  
  externals: {
    "jquery": "jQuery",
    "plotly.js": "Plotly"
  },
  
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loaders: ['babel?cacheDirectory'],
        include: PATHS.app
      },
      { 
        test: /\.jpe?g$|\.gif$|\.png$|\.svg$|\.woff$|\.ttf$|\.wav$|\.mp3$/, 
        loader: "file?name=[name].[ext]",
        include: PATHS.app
      }
    ]
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './app/template.ejs',
      inject: 'body',
      title: 'BBBFund @ Azure',
      appMountId: 'app'
    })
  ]
};

var finalConfig;
if (isDevelopment()) {
  finalConfig = merge(common, {
    module: {
      loaders: [
        {
          test:/\.css$/,
          loaders: ['style','css'],
          include: PATHS.app
        }
      ]
    },
    
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': '"development"'
      }),
    ],
    
    devtool: 'eval-source-map'
  });
}
else {
  finalConfig = merge(common, {
    module: {
      loaders: [
        {
          test:/\.css$/,
          loader: ExtractTextPlugin.extract('style','css'),
          include: PATHS.app
        }
      ]
    },
    
    plugins: [
      new CleanPlugin([PATHS.build], {
        verbose: false // Don't write logs to console
      }),
      
      new ExtractTextPlugin('style.css'),
      
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': '"production"'
      }),
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        }
      })
    ]
  });
}

module.exports = finalConfig;

function isDevelopment () {
  return (TARGET === 'dev' || !TARGET);
}