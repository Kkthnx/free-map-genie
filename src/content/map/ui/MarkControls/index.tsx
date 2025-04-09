import { ControlGroup, Control } from "@components/Controls";
import type { FMG_MapManager } from "@fmg/map-manager";
import { InjectedComponent } from "@shared/react";

import channel from "@shared/channel/content";

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
        const { no_confirm_mark_unmark_all } = await channel.offscreen.getSettings();

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