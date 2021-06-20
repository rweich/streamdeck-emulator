import * as path from 'path';
import * as webpack from 'webpack';

const config = (environment: unknown, options: { mode: string; env: unknown }): webpack.Configuration => {
  return {
    entry: {
      bundle: './src/client/index.ts',
    },
    target: 'web',
    output: {
      path: path.resolve(__dirname, 'dist/client'),
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
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    optimization: {
      splitChunks: {},
    },
  };
};

export default config;
