import { ControlGroup, Control } from "@components/Controls";
import type { FMG_MapManager } from "@fmg/map-manager";
import { InjectedComponent } from "@shared/react";

// [CRITICAL] REMOVED: import channel from "@shared/channel/content";
// Channel uses chrome.runtime which is banned in MAIN world

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

        window.postMessage({ type: "fmg:settings:request", requestId }, "*");
        
        setTimeout(() => {
            window.removeEventListener("message", listener);
            resolve({
                extension_enabled: true,
                no_confirm_mark_unmark_all: false
            } as FMG.Extension.Settings);
        }, 2000);
    });
}

export interface MarkControlsProps {
    onMarkAll: () => void;
    onUnmarkAll: () => void;
}

export default class MarkControls extends InjectedComponent<MarkControlsProps> {

    private mapManager: FMG_MapManager;

    public constructor(mapManager: FMG_MapManager) {
        super(".mapboxgl-ctrl-bottom-right", {
            onMarkAll: () => this.mark(true),
            onUnmarkAll: () => this.mark(false),
        });

        this.mapManager = mapManager;
    }

    private async mark(found: boolean) {
        const { no_confirm_mark_unmark_all } = await getSettings();

        if (
            !no_confirm_mark_unmark_all &&
            !confirm(`${found ? "Mark" : "Unmark"} all visible locations?`)
        ) {
            return;
        }

        const { map } = this.mapManager.store.getState();
        const { locationsByCategory, categories } = map;

        Object.values(categories).forEach((category) => {
            if (category.visible) {
                const locations = locationsByCategory[category.id];
                locations.forEach((location) => {
                    this.mapManager.markLocationFound(location.id, found);
                    this.mapManager.storage.data.locations[location.id] = found;
                });
            }
        });
        this.mapManager.save();
        this.mapManager.refresh();
    }

    protected override render() {
        const { onMarkAll, onUnmarkAll } = this.props;

        return (
            <ControlGroup>
                <Control
                    name="Mark All"
                    icon="plus-squared"
                    onClick={onMarkAll}
                />
                <Control
                    name="Unmark All"
                    icon="cancel-squared"
                    onClick={onUnmarkAll}
                />
            </ControlGroup>
        );
    }
}