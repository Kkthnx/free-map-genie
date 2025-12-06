import FMG_Data from "./data";
import FMG_Drivers from "./drivers";
import FMG_Keys from "./keys";

export class FMG_Storage {
    public readonly window: Window;
    public driver: FMG.Storage.Driver;
    public keyData: FMG.Storage.KeyData;

    private _data: Record<string, FMG_Data> = {};

    public constructor(window: Window, keyData: FMG.Storage.KeyData) {
        this.window = window;
        this.driver = FMG_Drivers.newLocalStorageDriver(window);
        this.keyData = keyData;

        if (this.window.mapData) {
            // PERFORMANCE FIX: Always load ONLY the current map.
            // Previously, checking 'isMini' caused it to load ALL maps, 
            // which is slow and unnecessary for guide pages.
            const maps = [this.window.mapData.map];

            this._data = Object.fromEntries(
                maps.map((map) => {
                    const keyData: FMG.Storage.KeyData = {
                        ...this.keyData,
                        mapId: map.id
                    };
                    return [
                        FMG_Keys.getV2Key(keyData),
                        FMG_Data.new(keyData, this.driver)
                    ] as const;
                })
            );
        }
    }

    public get data(): FMG_Data {
        if (this.window.user) {
            return this._data[FMG_Keys.getV2Key(this.keyData)] ?? FMG_Data.empty();
        }
        return FMG_Data.empty();
    }

    public get all(): Record<string, FMG_Data> {
        return this._data;
    }

    public async load(): Promise<void> {
        await Promise.all(Object.values(this._data).map((data) => data.load()));
        logger.debug("Loaded storage", this._data);
    }

    public async save(): Promise<void> {
        await Promise.all(Object.values(this._data).map((data) => data.save()));
        logger.debug("Saved storage", this._data);
    }

    public async clearCurrentMap(): Promise<void> {
        if (!this.window.user || !this.window.mapData) return;
        await this.data.clear();
    }
}
