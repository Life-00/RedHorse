const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
    user: './src/lambda/user.ts',
    schedule: './src/lambda/schedule.ts',
    dashboard: './src/lambda/dashboard.ts',
    file: './src/lambda/file.ts',
    batch: './src/lambda/batch.ts',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/lambda'),
    libraryTarget: 'commonjs2',
  },
  externals: {
    'aws-sdk': 'aws-sdk',
    'pg-native': 'pg-native',
  },
  optimization: {
    minimize: false, // Lambda에서 디버깅을 위해 최소화 비활성화
  },
};