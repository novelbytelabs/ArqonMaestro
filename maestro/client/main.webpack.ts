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
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
            },
          },
        ],
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
    // Keep ws optional native deps external so require() can throw and ws can
    // fall back to its pure-JS path.
    bufferutil: "commonjs bufferutil",
    "utf-8-validate": "commonjs utf-8-validate",
  },
  plugins: [
    new WebpackShellPlugin({
      onBuildEnd: {
        scripts: [
          () => {
            const fs = require("fs-extra");
            fs.mkdirpSync("out/static");
            fs.copySync(
              "static/custom-commands-server",
              "out/static/custom-commands-server"
            );
            fs.copySync(
              "static/custom-commands-server/node_modules",
              "out/static/custom-commands-server-modules"
            );
            if (fs.existsSync("static/local")) {
              fs.copySync("static/local", "out/static/local");
            }
          },
        ],
      },
    }),
  ],
};

export default config;
