import { generateFonts } from "fantasticon";
import { validate } from "schema-utils";
import webpack from "webpack";

import path from "node:path";
import fs from "node:fs";

const _pathJoin = path.join;
path.join = (...paths) => {
    if (paths[1]?.startsWith("**/*.")) {
        return _pathJoin(...paths).replace(/\\/g, "/");
    }
    return _pathJoin(...paths);
};

/**
 * @typedef {import("fantasticon").RunnerOptions} RunnerOptions
 */

/**
 * @typedef {(fontConfig: RunnerOptions) => any | null} OnCompleteCallback
 * 
 * @typedef {object} FantasticonPluginOptions 
 * @property {RunnerOptions} config
 * @property {OnCompleteCallback | undefined} onComplete
 */

/**
 * @type {Parameters<typeof validate>[0]}
 */
const schema = {
    type: "object",
    required: ["config"],
    properties: {
        config: {
            type: "object",
        },
        onComplete: {
            instanceof: "Function",
        },
    },
};

/**
 * @property {string} pluginName
 * @property {FantasticonPluginOptions} options
 */
export default class FantasticonPlugin {
    /**
     * @param {FantasticonPluginOptions} options 
     */
    constructor(options) {
        this.pluginName = "Fantasticon Plugin";
        this.options = options;
        validate(schema, options, {
            name: this.pluginName,
            baseDataPath: "options",
        });
    }

    /**
     * @param {webpack.Compiler} compiler 
     */
    apply(compiler) {
        const { config } = this.options;

        config.pathOptions = Object.fromEntries(
            Object.entries(config.pathOptions ?? {}).map(([ext, path]) => [ext, this.fixPath(compiler, path)])
        );

        config.outputDir = this.fixPath(compiler, config.outputDir);

        const inputDir = path.resolve(config.inputDir);

        compiler.hooks.compilation.tap(this.pluginName, (compilation) => {
            compilation.contextDependencies.add(inputDir);
        });

        compiler.hooks.beforeRun.tapAsync(this.pluginName, async (_compiler, callback) =>
            this.generateFont(config, callback)
        );

        compiler.hooks.watchRun.tapAsync(this.pluginName, async (compiler, callback) =>
            !compiler.modifiedFiles || compiler.modifiedFiles.has(inputDir)
                ? this.generateFont(config, callback)
                : callback()
        );
    }

    /**
     * @param {webpack.Compiler} compiler
     * @param {string} path
     */
    fixPath(compiler, path) {
        return path.replace("[dist]", compiler.options.output.path ?? "./dist");
    }

    /**
     * @param {RunnerOptions} fontConfig
     * @param {(err?: any) => void} callback
     */
    async generateFont(fontConfig, callback) {
        const { onComplete = null } = this.options;

        try {
            console.log("> Compiling icon font!");

            if (!fs.existsSync(fontConfig.outputDir)) {
                fs.mkdirSync(fontConfig.outputDir, { recursive: true });
            }

            await generateFonts(fontConfig);

            if (onComplete) onComplete(fontConfig);
            console.log("> Icon font compiled!");
            callback();
        } catch (err) {
            callback(err);
        }
    }
}