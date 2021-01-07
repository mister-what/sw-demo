import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: {
    "service-worker": require.resolve("./src/service-worker"),
  },
  output: {
    entryFileNames: "[name].js",
    dir: "./public",
    format: "iife",
  },
  plugins: [nodeResolve(), commonjs()],
};
