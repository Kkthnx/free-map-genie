import { waitForCallback, waitForGlobals } from "@shared/async";
import { getElement, documentLoaded } from "@shared/dom";

import { FMG_Map } from "@content/map";
import { FMG_ApiFilter } from "@fmg/filters/api-filter";
import { FMG_CheckboxManager } from "./checkbox-manager";

import setupApiFilter from "@content/filters/api-filter";

export interface FMG_GuideSetupResult {
    reload: () => Promise<void>;
}

export class FMG_Guide {

    public readonly window: Window;
    public readonly checkboxManager: FMG_CheckboxManager;

    private _miniMap?: FMG_Map;
    private _mapElement?: HTMLIFrameElement;

    constructor(window: Window) {
        this.window = window;
        this.checkboxManager = new FMG_CheckboxManager(window);
    }

    public get user(): number | null {
        return this.miniMap.window.user?.id ?? null;
    }

    public get miniMap(): FMG_Map {
        if (!this._miniMap) throw new Error("Minimap not setup.");
        return this._miniMap;
    }

    public get mapElement(): HTMLIFrameElement {
        if (!this._mapElement) throw new Error("mapElement not setup.");
        return this._mapElement;
    }

    public async cleanupProAds() {
        // Updated to remove various forms of "Upgrade to Pro" buttons/banners
        const selectors = [
            "#button-upgrade",
            "blockquote", 
            ".w-full.text-center.p-2.bg-white", // Catches the 'Upgrade to Pro' banner container
            "a[href*='/upgrade']"
        ];
        
        selectors.forEach(selector => {
            // Try to find and remove elements, but don't error if they aren't there
            getElement(selector, this.window, 1000)
                .then(elem => elem.remove())
                .catch(() => {}); 
        });
    }

    private async waitForMapElementLoaded(): Promise<HTMLIFrameElement> {
        // Fix: Changed selector from "#sticky-map iframe" to generic map iframe selector
        // This ensures it works on guides where the map isn't in a sticky header.
        const mapElement = await getElement<HTMLIFrameElement>("iframe[src*='/maps/']", this.window, 10000);
        await waitForCallback(() => !!mapElement.contentWindow, 10000);   
        await waitForGlobals(["mapData"], mapElement.contentWindow!, 10000);
        await documentLoaded(mapElement.contentWindow!, 10000);
        return mapElement;
    }

    private async setupMinimap(): Promise<void> {
        this._miniMap = new FMG_Map(this.mapElement.contentWindow!);
        this._miniMap!.setup();
        this.checkboxManager.mapManager = this._miniMap!.mapManager;
        this._miniMap!.mapManager.on("fmg-location", (e) => {
            this.checkboxManager.mark(e.detail.id, e.detail.marked);
        });
    }

    private loadData(): void {
        if (this.miniMap.mapManager.window.mapData) {
            this.window.mapData = this.miniMap.window.mapData ?? ({} as any);
            this.window.mapData!.maps = this.miniMap.window.mapData?.maps ?? [];
            this.window.game = this.miniMap.window.game;
        } else {
            throw new Error("Unable to find map data");
        }
    }

    public async reload(): Promise<void> {
        await this.miniMap.mapManager.reload();
        this.checkboxManager.reload();
    }

    /**
     * Setup the guide
     */
    public async setup(): Promise<void> {
        try {
            this._mapElement = await this.waitForMapElementLoaded();

            await this.setupMinimap();
            this.loadData();
            this.checkboxManager.reload();

            // Listen for src changes
            this.mapElement.addEventListener("load", async () => {
                await this.waitForMapElementLoaded();
                await this.setupMinimap();
                await this.miniMap.mapManager.reload();
            });

            // Wait for axios to load
            await waitForGlobals(["axios"], window, 10000);

            // Cleanup pro ads
            this.cleanupProAds().catch();

            // Setup the api filter
            const apiFilter = FMG_ApiFilter.install(window);
            setupApiFilter(apiFilter, this.miniMap.mapManager);

            logger.log("Guide setup complete");
        } catch (e) {
            logger.error("FMG Guide setup failed", e);
        }
    }
}
