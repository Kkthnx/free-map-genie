import { isNotEmpty } from "@shared/utils";
import FMG_Keys from "../keys";
import FMG_StorageDataMigrator from "../migration";

type ExportedJson = FMG.Storage.V1.ExportedJson | FMG.Storage.V2.ExportedJson;

export class FMG_ImportHelper {
    public static async showFilePicker(): Promise<string | undefined> {
        const input = document.createElement("input");
        document.body.appendChild(input);
        input.style.display = "none";
        input.type = "file";
        input.accept = ".json";
        input.click();

        return new Promise((resolve) => {
            input.onchange = async () => {
                const file = input.files?.[0];
                if (file) {
                    const text = await file?.text();
                    resolve(text);
                } else {
                    resolve(void 0);
                }
                document.body.removeChild(input);
            };
        });
    }

    public static async import(driver: FMG.Storage.Driver, keyData: FMG.Storage.KeyData, json: string) {
        let currentData;

        const key = FMG_Keys.getLatestKey(keyData);

        try {
            // Read the file and parse it
            const data = JSON.parse(json) as ExportedJson & {
                mapId?: number;
            };

            // If the game or map id is not the same, throw an error
            const { gameId, mapId, userId } = data;
            
            if (gameId !== keyData.gameId) {
                window.toastr.error(`Data does not belong to current game. Got gameId ${gameId}, expexted gameId ${keyData.gameId}`);
                throw new Error("Invalid game id");
            } else if (mapId && mapId !== keyData.mapId) {
                window.toastr.error(`Data does not belong to current map. Got mapId ${mapId}, expexted mapId ${keyData.mapId}`);
                throw new Error("Invalid map id");
            }

            // Get the current data
            currentData = await driver.get(key);

            // If our current data is not empty, ask the user if they want to overwrite it
            if (isNotEmpty(currentData)) {
                const result = confirm(
                    "Are you sure you want to overwrite your current data?"
                );
                if (!result) return;
                else {
                    // Remove the current data
                    await driver.remove(key);
                }
            }

            // If the user id is not the same, ask the user if they want to continue
            if (userId !== keyData.userId) {
                const result = confirm(
                    "The user id does not match, do you want to continue?"
                );
                if (!result) return;
            }

            // Check the version and handle it
            if (data.version === "v5") {
                await driver.set(FMG_Keys.getV1Key(keyData), data.storageObject);
                await FMG_StorageDataMigrator.migrateLegacyData(window);
            } else if (data.version === 2) {
                await driver.set(FMG_Keys.getV2Key(keyData), data.data);
            } else {
                throw new Error("Unknown version");
            }
        } catch {
            // Restore the current data, If we failed to import
            if (currentData && isNotEmpty(currentData)) {
                await driver.set(key, currentData);
            }
        }
    }
}
