import browser from "webextension-polyfill";
import channel from "@shared/channel/extension";

declare global {
    export interface ExtensionChannel {
        hello(): string;
        addBookmark(): { url: string, favicon: string, title: string } | undefined;
    }
}

// The Bridge Logic
// This script runs in the ISOLATED world, so it can use 'browser.*' APIs.
// It listens for messages from 'content.js' (Main World) and proxies them.

function injectIsolatedUI() {
    // Create a host for your React/UI components that is hidden from the page styles
    const host = document.createElement("div");
    host.id = "fmg-ui-host";
    
    // Append to body if available, otherwise wait for it
    if (document.body) {
        document.body.appendChild(host);
    } else {
        // Since we run at document_start, body might not exist yet
        const appendToBody = () => {
            if (document.body) {
                document.body.appendChild(host);
                return true;
            }
            return false;
        };
        
        if (!appendToBody()) {
            // Wait for body to be created
            const observer = new MutationObserver(() => {
                if (appendToBody()) {
                    observer.disconnect();
                }
            });
            observer.observe(document.documentElement, { childList: true });
        }
    }
    
    // Attach Shadow DOM
    const shadow = host.attachShadow({ mode: "open" });
    
    // Inject CSS into Shadow DOM to prevent CSS conflicts
    const contentCssLink = document.createElement("link");
    contentCssLink.rel = "stylesheet";
    contentCssLink.href = browser.runtime.getURL("css/content.css");
    shadow.appendChild(contentCssLink);
    
    const fontCssLink = document.createElement("link");
    fontCssLink.rel = "stylesheet";
    fontCssLink.href = browser.runtime.getURL("font/fmg-font.css");
    shadow.appendChild(fontCssLink);
    
    // Make shadow root accessible globally for components that want to mount into it
    // Mount your UI components (e.g. settings button) inside 'shadow'
    (window as any).__fmgShadowRoot = shadow;
    
    return shadow;
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

    const favicon = $icon?.href ?? browser.runtime.getURL("icons/fmg-icon-32.png");

    // Prefer OG title, but fall back to document title or URL
    const $title = document.head.querySelector(
        "meta[property='og:title']"
    ) as HTMLMetaElement | null;

    const title = $title?.content ?? document.title ?? url;

    return { url, favicon, title };
});

// 1. Listen for "getState" from the Popup/Background
channel.onMessage("getState", async () => {
    // 2. Forward the request to the Main World (content.js) via window.postMessage
    return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        
        // Set up a one-time listener for the response
        const listener = (event: MessageEvent) => {
            if (event.source !== window || !event.data) return;
            
            if (event.data.type === "fmg:state:response" && event.data.requestId === requestId) {
                window.removeEventListener("message", listener);
                resolve(event.data.state);
            }
        };
        window.addEventListener("message", listener);

        // Send the request
        window.postMessage({ type: "fmg:state:request", requestId }, "*");
        
        // Timeout safety
        setTimeout(() => {
            window.removeEventListener("message", listener);
            resolve(null); // Return null if content.js doesn't reply
        }, 1000);
    });
});

// Listen for settings requests from content.js (MAIN world)
window.addEventListener("message", async (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === "fmg:settings:request") {
        try {
            const settings = await channel.offscreen.getSettings();
            window.postMessage({
                type: "fmg:settings:response",
                requestId: event.data.requestId,
                settings: settings
            }, "*");
        } catch (error) {
            logger.error("Failed to get settings for bridge", error);
        }
    }
});

async function init() {
    channel.connect(); 

    const settings = await channel.offscreen.getSettings();
    if (!settings.extension_enabled) {
        channel.disconnect();
        return;
    }

    // [CRITICAL] Global CSS Injection to hide Pro Buttons on the actual page
    // We cannot use Shadow DOM for this because we want to affect the PAGE, not our UI.
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = browser.runtime.getURL("css/content.css");
    (document.head || document.documentElement).appendChild(link);

    // Also inject font CSS globally
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = browser.runtime.getURL("font/fmg-font.css");
    (document.head || document.documentElement).appendChild(fontLink);

    // Use Shadow DOM for UI injection to prevent CSS conflicts
    injectIsolatedUI(); 

    logger.log("Extension Bridge Loaded");
}

init().catch(logger.error);
