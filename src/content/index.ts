// 1. REMOVE THIS IMPORT: import channel from "@shared/channel/content";
import { getPageType, type PageType } from "@fmg/page";
import { FMG_Map } from "./map";
import { FMG_Guide } from "./guide";
import { FMG_MapSelector } from "./map-selector";
import debounce from "@shared/debounce";

export interface State {
    user: string;
    type: PageType;
}

// Global State
let state: State = {
    user: "n/a",
    type: "unknown"
};

function setState(newState: Partial<State>) {
    state = { ...state, ...newState };
}

// 2. NEW MESSAGING SYSTEM
// Listen for requests from 'extension.js' (Isolated World)
window.addEventListener("message", (event) => {
    // Security check: must be from same window
    if (event.source !== window || !event.data) return;

    // When the popup asks for state...
    if (event.data.type === "fmg:state:request") {
        // ...send it back via postMessage
        window.postMessage({
            type: "fmg:state:response",
            requestId: event.data.requestId,
            state: state
        }, "*");
    }
});

function listenForRefocus(callback: () => void) {
    document.addEventListener("visibilitychange", debounce(() => {
        if (document.visibilityState === "visible") {
            callback();
            logger.debug("refocused");
        }
    }, 250));
}

async function init() {
    const type = await getPageType(window);
    logger.debug("pageType:", type);

    switch (type) {
        case "map": {
            const map = new FMG_Map(window);
            await map.setup();
            listenForRefocus(() => map.reload());
            setState({ user: String(map.user), type });
            break;
        }
        case "guide": {
            const guide = new FMG_Guide(window);
            await guide.setup();
            listenForRefocus(() => guide.reload());
            setState({ user: String(guide.user), type });
            break;
        }
        case "map-selector":
            await FMG_MapSelector.setup(window);
            setState({ type });
            break;
        case "home":
            setState({ type });
            break;
        case "unknown":
            logger.warn(`Page type ${type}, not attaching content script`);
            break;
    }
}

init().catch((err) => {
    // Send error to the bridge if needed, or just log
    logger.error("[CONTENT]", err);
});