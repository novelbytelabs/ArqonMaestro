import * as path from "path";
import { Configuration } from "webpack";

const WebpackShellPlugin = require("webpack-shell-plugin-next");

const config: Configuration = {
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    modules: ["node_modules"],
  },
  devtool: "source-map",
  entry: path.resolve(__dirname, "src/main/index.ts"),
  // CRITICAL: Use electron-main target - handles electron module natively
  target: "electron-main",
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        include: [
          path.resolve(__dirname, "src/gen"),
          path.resolve(__dirname, "src/main"),
          path.resolve(__dirname, "src/shared"),
          path.resolve(__dirname, "src/audio"),
          path.resolve(__dirname, "src/driver"),
        ],
        use: ["ts-loader"],
      },
      {
        test: /\.(png|svg|jpg)$/i,
        type: "asset/resource",
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, "out"),
    filename: "[name].js",
  },
  // CRITICAL FIX: Don't externalize electron - Electron provides it
  externals: {
    "electron-updater": "commonjs electron-updater",
    "electron-log": "commonjs electron-log",
  },
  plugins: [
    new WebpackShellPlugin({
      onBuildEnd: {
        scripts: [
          () => {
            const fs = require("fs-extra");
            fs.mkdirpSync("out/static");
            fs.copySync(
              "static/custom-commands-server/node_modules",
              "out/static/custom-commands-server-modules"
            );
          },
        ],
      },
    }),
  ],
};

export default config;
