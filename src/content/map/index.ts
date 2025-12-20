import { getElement } from "@shared/dom";
import { waitForCallback, waitForGlobals, timeout } from "@shared/async";
// [CRITICAL] REMOVED: import channel from "@shared/channel/content";
// Channel uses chrome.runtime which is banned in MAIN world

import { FMG_StorageFilter } from "@fmg/filters/storage-filter";
import { installContentApiFilter } from "@/content/filters/api-filter";
import { FMG_HeatmapsData, FMG_MapData } from "@fmg/info";
import { FMG_MapManager } from "@fmg/map-manager";
import FMG_StorageDataMigrator from "@fmg/storage/migration";
import { importSharedNoteFromUrl } from "@fmg/share";

import setupStorageFilter from "@/content/filters/storage-filter";
import type { ExportedData } from "@fmg/storage/data/export";

import FMG_UI from "./ui";
import MapSwitcherPanel from "./map-panel";
import AdBlocker from "@fmg/ads";

// Type alias for backward compatibility
type FMG_MapPanel = typeof MapSwitcherPanel;

// Mock channel to prevent crashes
const channel = {
    post: (type: string, data?: any) => {
        window.postMessage({ type: `fmg:${type}`, data }, "*");
    }
};

// Helper to get settings via window.postMessage bridge (MAIN world safe)
async function getSettings(): Promise<FMG.Extension.Settings> {
    return new Promise((resolve) => {
        const requestId = Math.random().toString(36).substring(7);
        
        const listener = (event: MessageEvent) => {
            if (event.source !== window || !event.data) return;
            
            if (event.data.type === "fmg:settings:response" && event.data.requestId === requestId) {
                window.removeEventListener("message", listener);
                resolve(event.data.settings);
            }
        };
        window.addEventListener("message", listener);

        // Request settings from extension.js (bridge)
        window.postMessage({ type: "fmg:settings:request", requestId }, "*");
        
        // Timeout fallback - return default settings
        setTimeout(() => {
            window.removeEventListener("message", listener);
            // Return minimal default settings if bridge doesn't respond
            resolve({
                extension_enabled: true,
                mock_user: false,
                presets_allways_enabled: false,
                no_confirm_mark_unmark_all: false
            } as FMG.Extension.Settings);
        }, 2000);
    });
}

export const FmgMapInstalled = Symbol("FmgMapInstalled");

export type FmgMapWindow = Window & { [FmgMapInstalled]?: FMG_Map };

/**
 * The fmg map script
 * Handles all map related functionality
 */
export class FMG_Map {

    public readonly mapManager: FMG_MapManager;
    public readonly url: URL;
    public readonly ui: FMG_UI;

    public window: Window;
    // Note: panel property removed for simplified setup

    constructor(window: Window, mapManager?: FMG_MapManager) {
        this.window = window;
        this.mapManager = mapManager ?? new FMG_MapManager(window);
        this.url = new URL(window.location.href);
        this.ui = new FMG_UI(this.mapManager);
    }

    public get user(): number | null {
        return this.window.user?.id ?? null;
    }

    /**
     * Get map if map search param is provided.
     */
    private get map(): string | null {
        return this.url.searchParams.get("map");
    }

    /**
     * Get mapId if map search param is provided.
     */
    private get mapId(): number | null {
        return this.map
            ? this.window.mapData?.maps
                .find(map => map.slug === this.map)?.id
            ?? (logger.error(
                `Map(${this.map}) not found, valid maps: `,
                this.window.mapData?.maps.map((map) => map.slug) || []
            ), null)
            : this.window.mapData?.map.id ?? null;
    }

    /*
     * Because we delayed the map script, we need to manually create the google maps object.
     * If altMapSdk is enabled.
     * Because google.maps will allready be defined by another script,
     * and there for the map script will never define a maps mock object.
     **/
    private fixGoogleMaps(): void {
        if (this.window.config?.altMapSdk) {
            this.window.google = this.window.google || {};
            this.window.google.maps = {
                Size: function () { }
            };
        }
    }

    /**
     * Load mock user if enabled.
     * And fill in data from storage.
     * @param window the window to load the user in
     */
    private loadUser() {
        if (this.window.user) {
            const {
                locations,
                locationIds,
                presets,
            } = this.mapManager.storage.data;

            this.window.fmgMapgenieAccountData = {
                locationIds: Object.keys(this.window.user.locations ?? {}).map(Number),
                categoryIds: this.window.user.trackedCategoryIds ?? []
            };

            this.window.user = {
                ...this.window.user,
                trackedCategoryIds: this.mapManager.storage.data.categoryIds,
                suggestions: [],
                hasPro: true,
                locations,
                gameLocationsCount: locationIds.length,
                presets
            };
        }

        if (this.window.mapData) {
            const { notes } = this.mapManager.storage.data;
            this.window.mapData.notes = notes;
        }
    }

    /**
     * Enable map editor.
     * At the momment nothing usfull can be done with as far as i know.
     */
    private enableEditor() {
        this.window.isEditor = true;
        if (this.window.user) this.window.user.role = "admin";
    }

    /**
     * Load map data, from url params.
     */
    private async loadMapData() {
        if (!this.mapId) return;
        if (!this.window.game) throw new Error("Game not found in window.");
        if (!this.window.mapData) throw new Error("Mapdata not loaded.");

        const map = await FMG_MapData.get(this.window.game.id, this.mapId);

        // Urls
        this.window.mapUrl = map.url;

        const ogMapData = this.window.mapData;
        logger.debug("Original Mapdata: ", ogMapData);

        // Map Data
        this.window.mapData = {
            ...ogMapData,
            ...map.mapData,
            maxMarkedLocations: Infinity
        };

        // If we are not loading a pro map load some original data back
        if (!this.map) {
            this.window.mapData.mapConfig = ogMapData.mapConfig;
        }

        // Fix tilesets when neccesary
        for (var tileset of this.window.mapData.mapConfig.tile_sets) {
            if (tileset.pattern != undefined) continue;

            const ogTileset = ogMapData.mapConfig.tile_sets.find(({ name }) => tileset.name === name);

            if (!ogTileset) {
                logger.warn(`Failed to fix tileset ${tileset.name}, no original tileset found.`);
                continue;
            }

            if (ogTileset.pattern != undefined) {
                tileset.pattern = ogTileset.pattern;
            } else if (ogTileset.path != undefined) {
                tileset.pattern = `${ogTileset.path}/{z}/{x}/{y}.jpg`;
            } else {
                logger.warn(`Failed to fix tileset ${tileset.name}, no pattern or path found on original tileset.`);
            }
        }

        this.window.initialZoom = map.config.initial_zoom;
        this.window.initialPosition = {
            lat: map.config.start_lat,
            lng: map.config.start_lng
        };

        if (this.window.mapData.heatmapGroups.length > 0) {
            const heatmaps = await FMG_HeatmapsData.get(this.mapId);

            this.window.mapData.heatmapGroups = heatmaps.groups;
            this.window.mapData.heatmapCategories = heatmaps.categories;
        }

        return;
    }

    /**
     * Enable pro features
     */
    private setupConfig(settings: FMG.Extension.Settings) {
        // Set configurations enabled.
        if (this.window.config) {
            if (settings.presets_allways_enabled) {
                this.window.config.presetsEnabled = true;
            }
        }
    }

    /**
     * Unlock maps in map switcher panel.
     */
    private unlockMaps() {
        if (!this.window.document.querySelector(".map-switcher-panel")) return;

        const panel = new MapSwitcherPanel();

        if (this.map) {
            panel.selectMap(this.map);
        }

        panel.unlock();
    }

    /**
     * Cleanup pro updrade ads.
     */
    private cleanupProUpgradeAds() {
        AdBlocker.start();

        if (__DEBUG__) {
            AdBlocker.onTick(logger.debug.bind("FMG AdBlocker stats:"));
            AdBlocker.removePrivacyPopup();
        }
    }

    /**
     * Load the map script, and wait for the globals to be defined.
     */
    private async loadMapScript(): Promise<void> {
        // If mapManager is already present, avoid injecting a duplicate script.
        if ((this.window as any).mapManager) {
            logger.debug("Map script already initialized, skipping injection");
            return;
        }

        const script = await getElement<HTMLScriptElement>(
            "script[src^='https://cdn.mapgenie.io/js/map.js?id=']",
            this.window
        );

        if (!script) throw new Error("Map script not found");

        const newScript = document.createElement("script");
        newScript.src = script.src.replace("id=", "ready&id=");
        this.window.document.body.appendChild(newScript);

        return timeout(
            waitForGlobals(["mapManager"], this.window),
            60000,
            "mapManager not found."
        );
    }

    /**
     * Attach ui
     */
    private attachUI() {
        this.ui.attach();
        this.mapManager.on("fmg-location", () => this.ui.update());
        this.mapManager.on("fmg-category", () => this.ui.update());
        this.mapManager.on("fmg-update", () => this.ui.update());
    }

    // Removed installTraps - JSON.parse hook handles this globally

    /**
     * Reload and update map.
     */
    public reload(): Promise<void> {
        return this.mapManager.reload();
    }

    /**
     * Setup
     */
    public async setup(): Promise<void> {
        try {
            // [STEP 1] Install Interceptors IMMEDIATELY
            // This prepares the fake user response before the app asks for it.
            installContentApiFilter(this.window, this.mapManager);

            // [STEP 2] Wait for MapGenie to be ready
            await waitForGlobals(["mapgenie", "axios", "store"], this.window);

            // [STEP 3] Runtime Patch (Double Tap)
            // Sometimes the initial state is baked into the HTML. We patch it here.
            if (this.window.user) {
                this.window.user.pro = true;
                this.window.user.role = "admin";
            }
            // Patch the Vue Store directly if available
            const store = (this.window as any).store;
            if (store && store.state && store.state.user) {
                store.state.user.user = { 
                    ...store.state.user.user, 
                    pro: true, 
                    role: "admin" 
                };
            }

            // [STEP 4] Load the rest
            FMG_StorageFilter.install(this.window);
            await this.mapManager.load();
            // Note: panel creation removed for simplified setup
            
            channel.post("map-loaded");
            logger.log("FMG: Map Setup Complete");
        } catch (err) {
            logger.error("FMG: Setup Error", err);
        }
    }
}
