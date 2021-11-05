// 配置来源于https://juejin.cn/post/7023242274876162084
const path = require('path')
const glob = require('glob')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const PurgecssPlugin = require('purgecss-webpack-plugin')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const OptimizaCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

function resolve(dir) {
  return path.resolve(__dirname, dir)
}
const PATHS = {
  src: path.join(__dirname, 'public')
}
module.exports = (mode, argv) => {
  // const { ANALYZER } = process.env
  console.log(argv.mode === 'production')
  return {
    mode: 'development',
    entry: './src/index.js',
    output: {
      path: resolve('dist'),
      filename: '[name].boundle.js'
    },
    devServer: {
      port: 8888,
      open: false,
      // 是webpack4的contentBase
      static: {
        directory: resolve('public/images') // 静态文件目录
      }
    },
    // devtool: 'eval-cheap-module-source-map',
    resolve: {
      // 别名
      alias: {
        '@': resolve('src'),
        src: resolve('src')
      },
      // 省略文件后缀名
      // 1.高频文件后缀名放前面；
      // 2.手动配置后，默认配置会被覆盖
      // 如果想保留默认配置，可以用 ... 扩展运算符代表默认配置，例如 extensions: ['.ts', '...'],
      extensions: ['.js', 'json', 'wasm'],
      // 告诉 webpack 解析模块时应该搜索的目录，常见配置如下
      // 告诉 webpack 优先 src 目录下查找需要解析的文件，会大大节省查找时间
      modules: [resolve('src'), 'node_modules']
    },
    module: {
      // 不需要解析依赖的第三方大型类库等，可以通过这个字段进行配置，以提高构建速度
      // 使用 noParse 进行忽略的模块文件中不会解析 import、require 等语法
      // noParse: /jquery|lodash/,
      rules: [
        {
          test: /\.js?$/i,
          use: [
            // 如果loader有options或者别的配置 需要下面这种写法
            {
              loader: 'babel-loader',
              options: {
                // babel 在转译 js 过程中时间开销比价大，将 babel-loader 的执行结果缓存起来，重新打包的时候，直接读取缓存
                cacheDirectory: true // 启用缓存 缓存位置： node_modules/.cache/babel-loader
              }
            }
          ],
          // exclude 优先级更高
          exclude: /node_modules/, // 排除符合条件的模块，不解析
          include: resolve('src') // 符合条件的模块进行解析
        },
        {
          test: /\.(css|scss|sass)$/i, //匹配所有的 sass/scss/css 文件
          use: [
            // 'style-loader', //样式通过 style 标签的形式添加到页面上
            argv.mode === 'production'
              ? MiniCssExtractPlugin.loader
              : 'style-loader', // 添加 loader 样式通过link的方式引入页面
            // 缓存一些性能开销比较大的 loader 的处理结果
            // 缓存位置：node_modules/.cache/cache-loader
            'cache-loader', // 获取前面 loader 转换的结果
            'css-loader',
            'postcss-loader',
            'sass-loader'
          ]
        },
        {
          // webpack5 新增资源模块(asset module)，允许使用资源文件（字体，图标等）而无需配置额外的 loader。
          // asset/resource 将资源分割为单独的文件，并导出 url，类似之前的 file-loader 的功能.
          // asset/inline 将资源导出为 dataUrl 的形式，类似之前的 url-loader 的小于 limit 参数时功能.
          // asset/source 将资源导出为源码（source code）. 类似的 raw-loader 功能.
          // asset 会根据文件大小来选择使用哪种类型，当文件小于 8 KB（默认） 的时候会使用 asset/inline，否则会使用 asset/resource
          test: /\.(jpe?g|png|gif)$/i,
          type: 'asset',
          generator: {
            // 输出文件位置以及文件名
            // [ext] 自带 "." 这个与 url-loader 配置不同
            filename: 'static/[name][contenthash][ext]'
          },
          parser: {
            dataUrlCondition: {
              maxSize: 50 * 1024 //超过50kb不转 base64
            }
          }
        }
      ]
    },
    // 在生产环境下打包默认会开启 js 压缩，但是当我们手动配置 optimization 选项之后，就不再默认对 js 进行压缩，需要我们手动去配置。
    // 因为 webpack5 内置了terser-webpack-plugin 插件，所以我们不需重复安装，直接引用就可以了
    optimization: {
      // 告知 webpack 使用 TerserPlugin 或其它在 optimization.minimizer定义的插件压缩 bundle。
      minimize: true, // 开启最小化
      // 允许你通过提供一个或多个定制过的 TerserPlugin 实例，覆盖默认压缩工具(minimizer)。
      minimizer: [
        // 添加css压缩配置
        new OptimizaCssAssetsPlugin(),
        new TerserPlugin()
      ]
    },
    // 持久化缓存 缓存生成的 webpack 模块和 chunk，来改善构建速度。
    cache: {
      type: 'filesystem'
    },
    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        title: 'webpack-config-test',
        template: './public/index.html'
      }),
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash].css'
      }),
      new PurgecssPlugin({
        paths: glob.sync(`${PATHS.src}/**/*`, {
          nodir: true
        })
      })
      // new BundleAnalyzerPlugin({
      //   // 如果，我们只想保留数据不想启动 web 服务，这个时候，我们可以加上两个配置
      //   analyzerMode: 'disabled' // 不启动展示打包报告的http服务器
      //   // generateStatsFile: true // 是否生成stats.json文件
      // }),
    ],
    // 配置选项提供了「从输出的 bundle 中排除依赖」的方法。此功能通常对 library 开发人员来说是最有用的，然而也会有各种各样的应用程序用到它。
    // 例如，从 CDN 引入 jQuery，而不是把它打包：
    // import $ from 'jquery';
    // $('.my-element').animate(/* ... */);
    externals: {
      jquery: 'jQuery'
    }
  }
}
