import * as path from 'path';
import * as webpack from 'webpack';

const config = (environment: unknown, options: { mode: string; env: unknown }): webpack.Configuration => {
  return {
    entry: {
      bundle: './src/browserclient/index.ts',
    },
    target: 'web',
    output: {
      path: path.resolve(__dirname, 'dist/browserclient'),
    },
    plugins: [],
    module: {
      rules: [
        {
          test: /\.(ts|js)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
          },
        },
        {
          test: /\.s[ac]ss$/i,
          use: [
            "style-loader",
            "css-loader",
            "sass-loader",
          ],
        },
        {
          test: /\.mjs$/,
          type: "javascript/auto",
          resolve: {
            fullySpecified: false
          }
        }
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      fallback: { "buffer": false, "os": false }
    },
    optimization: {
      splitChunks: {},
    },
  };
};

export default config;
