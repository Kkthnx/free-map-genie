import "dotenv/config";

import path from "node:path";
import fs from "node:fs";

import { FontAssetType, ASSET_TYPES } from "fantasticon";

import HtmlWebpackPlugin from "html-webpack-plugin";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import WebpackExtensionManifestPlugin from "webpack-extension-manifest-plugin";
import WebExtPlugin from "web-ext-plugin";
import CopyPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
// import { SwcMinifyWebpackPlugin } from "swc-minify-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";
import FantasticonPlugin from "./webpack/plugins/fantasticon.js";

const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

import webpack from "webpack";

/**
 * @typedef {Record<string, any>} Env;
 * @typedef {"dev" | "prod"} ShortMode;
 * @typedef {"development" | "production"} Mode;
 */

/**
 * @param {Env} env 
 * @param {string} name 
 * @param {string[]} matches 
 * @returns {string}
 */
function getEnvVar(env, name, matches) {
    const value = env[name];
    if (!value)
        throw new Error(
            `No ${name} specified. Use --env ${name}=${matches.join(" or ")}`
        );
    if (!matches.includes(value))
        throw new Error(
            `Invalid ${name} specified. Use --env ${name}=${matches.join(
                " or "
            )}`
        );
    return value;
}

/**
 * @param {ShortMode | Mode | undefined} mode
 * @returns {Mode}
 */
function parseMode(mode) {
    if (mode === "dev" || mode === undefined) {
        return "development";
    } 

    if (mode === "prod") {
        return "production";
    }

    return mode;
}

/**
 * @param {string} browser 
 * @param {Mode} mode 
 * @returns {string}
 */
function distPath(browser, mode) {
    return path.resolve(
        import.meta.dirname,
        "dist",
        `fmg-${browser}-v${packageJson.version}${
            mode === "development" ? "-dev" : ""
        }`
    );
}

/**
 * @param {string} browser 
 * @param {string} mode 
 * @returns {string}
 */
function distName(browser, mode) {
    return `fmg-${browser}-v${packageJson.version}` +
        (mode === "production"
            ? browser === "chrome"
                ? ".zip"
                : ".xpi"
            : "");
}

/**
 * @param {Env} env
 * @returns {webpack.Configuration}
 */
export default (env) => {
    const watch = env.WEBPACK_WATCH || false;

    const browser = getEnvVar(env, "browser", ["chrome", "firefox"]);
    const mode = parseMode(getEnvVar(env, "mode", ["dev", "prod", "development", "production"]));

    const isDev = mode !== "production";

    const dist = distPath(browser, mode);

    const GLOBALS = {
        __WATCH__: watch,
        __BROWSER__: JSON.stringify(browser),
        __MODE__: JSON.stringify(mode),
        __DEBUG__: isDev,
        __VERSION__: JSON.stringify(packageJson.version),
        __AUTHOR__: JSON.stringify(packageJson.author),
        __HOMEPAGE__: JSON.stringify(packageJson.homepage),
    };

    const files = [
        { from: "./src/icons", to: "icons" },
    ];

    // Configure the webpack
    return {
        mode,
        devtool: isDev ? "inline-cheap-module-source-map" : false,
        entry: {
            "extension": "./src/extension/index.ts",
            "content": "./src/content/index.ts",
            "popup/index": "./src/popup/index.tsx",
            "background": "./src/background/index.ts",
            "storage": "./src/storage/index.ts",
        },
        output: {
            path: dist,
            chunkFilename: "chunks/[name].[contenthash].js",
        },
        resolve: {
            extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
            plugins: [
                new TsconfigPathsPlugin({
                    configFile: path.resolve("tsconfig.web.json"),
                })
            ],
        },
        resolveLoader: {
            modules: ["node_modules", "webpack/loaders"],
        },
        module: {
            rules: [
                {
                    test: /\.(ts|tsx)$/,
                    exclude: /node_modules/,
                    use: [
                        "gnirts-loader",
                        "inject-globals",
                        {
                            loader: "swc-loader",
                            options: {
                                jsc: {
                                    parser: {
                                        syntax: "typescript",
                                        tsx: true,
                                        decorators: false,
                                        dynamicImport: true
                                    },
                                    target: "esnext"
                                },
                                minify: !isDev
                            }
                        }
                    ],
                },
                {
                    test: /\.(s[ac]ss|css)$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: "css-loader",
                            options: {
                                url: false
                            }
                        },
                        "sass-loader",
                    ]
                }
            ]
        },
        plugins: [
            // Fantasticon genrate font icons
            new FantasticonPlugin({
                config: {
                    name: "fmg-font",
                    prefix: "fmg-icon",
                    tag: "i",
                    inputDir: "icons",
                    outputDir: "[dist]/font",
                    descent: 50,
                    fontTypes: [FontAssetType.TTF, FontAssetType.WOFF, FontAssetType.WOFF2],
                    assetTypes: [ASSET_TYPES.CSS],
                },
            }),
            
            // Extract the css to a separate file
            new MiniCssExtractPlugin({
                filename: "css/[name].css",
            }),

            // Popup html file
            new HtmlWebpackPlugin({
                chunks: ["popup/index"],
                filename: "popup/index.html",
                template: "./src/popup/index.html"
            }),

            new HtmlWebpackPlugin({
                chunks: browser === "chrome" ? ["background"] : [],
                filename: browser === "chrome" ? "storage.html" : "background.html",
                template: "./src/storage/index.html"
            }),

            // Provide global modules
            new webpack.ProvidePlugin({
                $: "jquery",
                jQuery: "jquery",
                logger: [path.resolve(import.meta.dirname, "src/fmg/logger.ts"), "default"],
                React: "react"
            }),

            // Provide the global variables
            new webpack.DefinePlugin(GLOBALS),

            // Static files to copy to the dist folder
            new CopyPlugin({ patterns: files }),

            // Generate the manifest
            new WebpackExtensionManifestPlugin({
                config: {
                    base: "./src/manifest.json",
                    extend: `./src/manifest.${browser}.json`
                },
                pkgJsonProps: ["version", "description", "author", "name"]
            }),

            // Generate the extension
            new WebExtPlugin({
                sourceDir: dist,
                artifactsDir: "./dist",
                outputFilename: distName(browser, mode),
                overwriteDest: true,
                target: browser === "chrome" ? "chromium" : "firefox-desktop",
                devtools: true,
                selfHosted: true,
                chromiumBinary: process.env.CHROME_BIN,
                firefox: process.env.FIREFOX_BIN,
                firefoxProfile: process.env.FIREFOX_PROFILE,
                chromiumProfile: process.env.CHROMIUM_PROFILE,
                keepProfileChanges: process.env.KEEP_PROFILE_CHANGES === "true",
                startUrl: process.env.START_URL || "https://mapgenie.io/",
                runLint: false,
                buildPackage: mode === "production"
            })
        ],

        watch,
        watchOptions: {
            ignored: /node_modules/,
            aggregateTimeout: 300,
            poll: 1000
        },
        
        optimization: {
            splitChunks: {
                filename: "chunks/[name].js",
            },
            minimize: !isDev,
            minimizer: [new TerserPlugin()]
        }
    }
};
