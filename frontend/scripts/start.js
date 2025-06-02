#!/usr/bin/env node
require("dotenv").config({ path: __dirname + "/.env" });
const chalk = require("chalk");
const { buildConfig } = require("../webpack.config");
const fs = require("fs");
const path = require("path");
const Table = require("cli-table3");
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const open = require("open");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const { argv } = yargs(hideBin(process.argv)).option("use-https", {
  description: "Start local development server on HTTPS.",
  type: "boolean",
});
const jwt = require("jsonwebtoken");

const ROOT_DIR = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const EXAMPLES_DIR = path.join(ROOT_DIR, "examples");

const {
  CANVA_FRONTEND_PORT,
  CANVA_BACKEND_PORT,
  CANVA_APP_ID,
  CANVA_HMR_ENABLED,
} = process.env;

const getFrontendUrl = (protocol) =>
  `${protocol}://localhost:${CANVA_FRONTEND_PORT}`;

if (!CANVA_FRONTEND_PORT) {
  throw new Error("CANVA_FRONTEND_PORT environment variable is not defined");
}

if (!CANVA_BACKEND_PORT) {
  throw new Error("CANVA_BACKEND_PORT environment variable is not defined");
}

const [example] = argv._;

const SHOULD_ENABLE_HTTPS = argv.useHttps || process.env.npm_config_use_https;
const HMR_ENABLED = CANVA_HMR_ENABLED?.toLowerCase().trim() === "true";
const APP_ID = CANVA_APP_ID?.toLowerCase().trim() ?? "";

if (HMR_ENABLED && APP_ID.length === 0) {
  throw new Error(
    "CANVA_HMR_ENABLED environment variable is TRUE, but CANVA_APP_ID is not set. Refer to the instructions in the README.md on configuring HMR."
  );
}

const ENTRY_DIR = SRC_DIR;

async function start() {
  if (!fs.existsSync(ENTRY_DIR)) {
    throw new Error(`Directory does not exist: ${ENTRY_DIR}`);
  }

  console.log(
    `Starting development server for`,
    chalk.greenBright.bold(ENTRY_DIR)
  );
  console.log("");

  if (!HMR_ENABLED) {
    console.log(
      "HMR not enabled. To enable it, please refer to the instructions in the",
      chalk.greenBright.bold("README.md")
    );
    console.log("");
  }

  const table = new Table();

  const frontendEntry = path.join(ENTRY_DIR, "index.tsx");

  if (!fs.existsSync(frontendEntry)) {
    throw new Error(
      `Entry point for frontend does not exist: ${frontendEntry}`
    );
  }

  const runtimeWebpackConfig = buildConfig({
    appEntry: frontendEntry,
    backendHost: process.env.CANVA_BACKEND_HOST,
    devConfig: {
      port: CANVA_FRONTEND_PORT,
      enableHmr: HMR_ENABLED,
      appId: APP_ID,
      enableHttps: SHOULD_ENABLE_HTTPS,
    },
  });

  const compiler = webpack(runtimeWebpackConfig);
  const server = new WebpackDevServer(runtimeWebpackConfig.devServer, compiler);
  await server.start();

  table.push([
    "Development URL (Frontend)",
    chalk.cyan(getFrontendUrl(runtimeWebpackConfig.devServer.server.type)),
  ]);

  console.log(table.toString());
  console.log("");

  console.log(
    `${chalk.blue.bold(
      "Note:"
    )} For instructions on how to set up the app via the Developer Portal, see ${chalk.bold(
      path.join(ROOT_DIR, "README.md")
    )}.`
  );
}

start();
