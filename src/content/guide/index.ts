import { waitForCallback, waitForGlobals } from "@shared/async";
import { getElement } from "@shared/dom";

import { FMG_Map } from "@content/map";
import { FMG_CheckboxManager } from "./checkbox-manager";
import AdBlocker from "@fmg/ads";

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
        return this._miniMap?.window.user?.id ?? null;
    }

    public get miniMap(): FMG_Map {
        if (!this._miniMap) throw new Error("Minimap not setup.");
        return this._miniMap;
    }

    public get mapElement(): HTMLIFrameElement {
        if (!this._mapElement) throw new Error("mapElement not setup.");
        return this._mapElement;
    }

    private async waitForMapElementLoaded(): Promise<HTMLIFrameElement> {
        // 1. Find the iframe (more robust selector)
        const mapElement = await getElement<HTMLIFrameElement>("iframe[src*='/maps/']", this.window, 10000);
        await waitForCallback(() => !!mapElement.contentWindow, 10000);
        
        // 2. IMPORTANT: Wait for the content script INSIDE the iframe to finish initializing.
        // We look for 'fmgMapManager' which our map script attaches to the window.
        await waitForCallback(() => !!(mapElement.contentWindow as any).fmgMapManager, 15000);
        
        return mapElement;
    }

    private async setupMinimap(): Promise<void> {
        const contentWindow = this.mapElement.contentWindow!;
        
        // 3. Reuse the existing manager from the iframe
        const mapManager = (contentWindow as any).fmgMapManager;
        
        // 4. Create wrapper but DO NOT call .setup() again
        this._miniMap = new FMG_Map(contentWindow, mapManager);
        
        this.checkboxManager.mapManager = this._miniMap.mapManager;
        this._miniMap.mapManager.on("fmg-location", (e) => {
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
        if (!this._miniMap) {
            logger.debug("Minimap not setup yet, skipping reload");
            return;
        }
        await this._miniMap.mapManager.reload();
        this.checkboxManager.reload();
    }

    public async setup(): Promise<void> {
        try {
            this._mapElement = await this.waitForMapElementLoaded();

            await this.setupMinimap();
            this.loadData();
            this.checkboxManager.reload();

            // Handle iframe navigation/reloads
            this.mapElement.addEventListener("load", async () => {
                await this.waitForMapElementLoaded();
                await this.setupMinimap();
                if (this._miniMap) {
                    await this._miniMap.mapManager.reload();
                }
            });

            await waitForGlobals(["axios"], window, 10000);

            // Start the fixed AdBlocker
            AdBlocker.start();

            logger.log("Guide setup complete");
        } catch (e) {
            logger.error("FMG Guide setup failed", e);
        }
    }
}

