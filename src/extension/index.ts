import channel from "@shared/channel/extension";

declare global {
    export interface ExtensionChannel {
        hello(): string;
        addBookmark(): { url: string, favicon: string, title: string } | undefined;
    }
}

function injectScript(src: string): HTMLScriptElement {
    const head = document.head || document.documentElement;
    const script = document.createElement("script");
    script.src = src;
    head.appendChild(script);
    return script;
}

function injectLink(href: string): HTMLLinkElement {
    const head = document.head || document.documentElement;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    head.appendChild(link);
    return link;
}

channel.onMessage("hello", () => {
    return "Hello from the extension!";
});

channel.onMessage("addBookmark", () => {
    const url = window.location.href;
    const hostname = window.location.hostname;

    const searchParams = new URLSearchParams(window.location.search);

    // Ignore the special storage iframe so we don't bookmark ?fmg_storage=1
    if (searchParams.get("fmg_storage") === "1") {
        logger.warn("Ignoring storage iframe for bookmark", { url, hostname });
        return;
    }

    // Only allow bookmarks on MapGenie pages
    if (!hostname.endsWith("mapgenie.io")) {
        logger.warn("Bookmarks are only allowed on MapGenie pages", { url, hostname });
        return;
    }

    // Try to resolve a favicon; fall back to extension icon if not present on the page
    const $icon = document.head.querySelector(
        "link[rel='apple-touch-icon'], link[rel='icon']"
    ) as HTMLLinkElement | null;

    const favicon = $icon?.href ?? chrome.runtime.getURL("icons/fmg-icon-32.png");

    // Prefer OG title, but fall back to document title or URL
    const $title = document.head.querySelector(
        "meta[property='og:title']"
    ) as HTMLMetaElement | null;

    const title = $title?.content ?? document.title ?? url;

    return { url, favicon, title };
});

async function init() {
    channel.connect();

    const settings = await channel.offscreen.getSettings();
    if (!settings.extension_enabled) {
        channel.disconnect();
        return;
    }

    injectLink(chrome.runtime.getURL("css/content.css"));
    injectLink(chrome.runtime.getURL("font/fmg-font.css"));
    injectScript(chrome.runtime.getURL("content.js"));
}

init()
    .then(() => logger.log("extension script loaded"))
    .catch(logger.error);
