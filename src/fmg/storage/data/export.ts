import { isEmpty } from "@shared/utils";
import FMG_Keys from "../keys";

export interface ExportedData {
    json: string,
    filename: string
}

export class FMG_ExportHelper {
    public static getFileName(keyData: FMG.Storage.KeyData) {
        return `fmg_game_${keyData.gameId}_map_${keyData.mapId}_user_${
            keyData.userId
        }_${new Date().toISOString()}.json`;
    }

    public static async saveFile(data: ExportedData) {
        const blob = new Blob([data.json], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename;
        a.click();

        URL.revokeObjectURL(url);
    }

    static async export(driver: FMG.Storage.Driver, keyData: FMG.Storage.KeyData): Promise<ExportedData | undefined> {
        const data = await driver.get<FMG.Storage.V2.StorageObject>(
            FMG_Keys.getV2Key(keyData)
        );

        if (isEmpty(data)) {
            alert("No data to export");
            return;
        }

        const json: FMG.Storage.V2.ExportedJson = {
            version: 2,
            gameId: parseInt(keyData.gameId as string),
            mapId: parseInt(keyData.mapId as string),
            userId: parseInt(keyData.userId as string),
            data
        };

        return {
            json: JSON.stringify(json),
            filename: this.getFileName(keyData)
        };
    }
}
