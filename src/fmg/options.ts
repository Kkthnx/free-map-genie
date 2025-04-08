import Options from "@/options.json";

export { default as Options } from "@/options.json";

const defaultSettings = Object.fromEntries(
    Options.map(({ name, value }) => [name, value])
);

export function getDefaultSettings() {
    return {...defaultSettings} as any as FMG.Extension.Settings;
}