import browser from "webextension-polyfill";
import channel from "@shared/channel/background";
import { initStorage } from "./storage";
import "./api";

declare global {
    interface BackgroundChannel {
        settingsChanged(data: { settings: FMG.Extension.Settings }): void;
        reloadActiveTab(): boolean;
    }
}

// 1. REMOVED the Blocking Rule completely from active use
// We only want to strip headers from iframes, not block the map engine.
const ALLOW_MAPGENIE_IFRAME_RULE: chrome.declarativeNetRequest.Rule = {
    id: 2,
    priority: 1,
    action: {
        type: "modifyHeaders",
        responseHeaders: [
            { header: "X-Frame-Options", operation: "remove" },
            { header: "Frame-Options", operation: "remove" }
        ],
    },
    condition: {
        requestDomains: ["mapgenie.io"],
        resourceTypes: ["sub_frame"]
    },
};

// Only apply the Allow Rule
const RULES = [ALLOW_MAPGENIE_IFRAME_RULE];

// Helper to update rules safely
async function updateRules(enableBlock: boolean) {
    // We are no longer blocking the script, so this function essentially does nothing
    // regarding the block list, but we keep it to prevent compilation errors
    // if other parts of your app call 'settingsChanged'.
    if (!chrome.declarativeNetRequest) return;
    logger.debug(`Settings changed: ${enableBlock}`);
}

channel.onMessage("settingsChanged", ({ settings }) => {
    updateRules(settings.extension_enabled).catch(logger.error);
});

channel.onMessage("reloadActiveTab", async () => {
    try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        
        if (tabId !== undefined) {
            await browser.tabs.reload(tabId);
            return true;
        }
        return false;
    } catch (e) {
        logger.error("Failed to reload active tab", e);
        return false;
    }
});

async function init() {
    if (chrome.declarativeNetRequest) {
        try {
            // Reset rules to ONLY allow iframes. 
            // We remove ID 1 (The Block Rule) explicitly just in case it was stuck.
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [1, 2], 
                addRules: RULES,
            });
        } catch (error) {
            logger.error("Failed to update dynamic rules", error);
        }
    }

    await initStorage();
}

init()
    .then(() => logger.log("Background script loaded"))
    .catch(logger.error);