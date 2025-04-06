import type { FMG_ApiFilter } from "@fmg/filters/api-filter";
import type { FMG_MapManager } from "@fmg/map-manager";

type PresetPostData = Omit<MG.Preset, "id"> & { ordering: number[] };
type ReorderPostData = { ordering: number[] };

export default function (filter: FMG_ApiFilter, mapManager: FMG_MapManager) {
    filter.registerFilter<PresetPostData>(
        "post",
        "presets",
        false,
        (_method, _key, _id, data, _url, block) => {
            block();

            logger.debug("preset", data);
            const id = mapManager.hasDemoPreset()
                ? data.ordering.length
                : data.ordering.length + 1;

            // Add the preset to the presets array
            mapManager.storage.data.presets.push({
                id,
                title: data.title,
                categories: data.categories,
                order: data.ordering.length
            });

            data.ordering.push(id);
            logger.debug(data.ordering);
            mapManager.storage.data.presetOrder = data.ordering;

            logger.debug("Added preset", id, data);

            mapManager.storage.data.save();

            mapManager.fire("fmg-preset", {
                preset: mapManager.storage.data.presets[id],
                action: "added"
            });

            return { data };
        }
    );

    filter.registerFilter<PresetPostData>(
        "delete",
        "presets",
        true,
        (_method, _key, id, _data, _url, block) => {
            block();

            logger.debug("Deleting preset", id);

            const idAsNumber = Number(id);

            // Remove the preset from the presets array
            const presetIndex = mapManager.storage.data.presets.findIndex((preset) => preset.id === idAsNumber);
            if (presetIndex < 0) {
                logger.warn(`Failed to remove preset with id ${id} not found in storage.`);
                return ;
            }

            mapManager.storage.data.presets.splice(presetIndex, 1);

            // Update preset ids
            mapManager.storage.data.presets.forEach((preset, index) => {
                preset.id = index + 1;
            });

            // Remove presetId from presetOrder
            // And shift all presetIds above it down by 1
            mapManager.storage.data.presetOrder =
                mapManager.storage.data.presetOrder
                    .map((presetId) => {
                        if (mapManager.defaultPresetsIds.includes(presetId)) return presetId;
                        else if (presetId > idAsNumber) return presetId - 1;
                        else if (presetId == idAsNumber) return undefined;
                        return presetId;
                    })
                    .filter((presetId) => presetId !== undefined);

            // Check if the only presetId in presetOrder is -1
            // If so then reset presetOrder to empty
            if (
                mapManager.storage.data.presetOrder.length == mapManager.defaultPresetsIds.length
            ) {
                mapManager.storage.data.presetOrder = [];
            }

            mapManager.storage.data.save();

            mapManager.fire("fmg-preset", {
                action: "removed"
            });

            return;
        }
    );

    filter.registerFilter<ReorderPostData>(
        "post",
        "presets/reorder",
        false,
        (_method, _key, _id, data, _url, block) => {
            block();

            logger.debug("Reordering presets", data.ordering);
            mapManager.storage.data.presetOrder = data.ordering;
            mapManager.storage.data.save();
            mapManager.updatePresets();
            mapManager.fire("fmg-preset", {
                ordering: data.ordering,
                action: "reordered"
            });
   
            return;
        }
    );
}
