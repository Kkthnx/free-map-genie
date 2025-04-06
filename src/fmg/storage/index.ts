import FMG_Data from "./data";
import FMG_Drivers from "./drivers";
import FMG_Keys from "./keys";

export class FMG_Storage {
    // private static storages: Record<string, FMG_Storage> = {};

    public readonly window: Window;

    public driver: FMG.Storage.Driver;
    public keyData: FMG.Storage.KeyData;

    // private _keyData: FMG.Storage.KeyData;
    // private _keys?: FMG_Keys;

    private _data: Record<string, FMG_Data> = {};

    public constructor(window: Window, keyData: FMG.Storage.KeyData) {
        this.window = window;
        this.driver = FMG_Drivers.newLocalStorageDriver(window);
        
        this.keyData = keyData;

        if (this.window.mapData)
        {
            const maps = this.window.isMini
                ? this.window.mapData.maps
                : [this.window.mapData.map];

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
            return this._data[FMG_Keys.getV2Key(this.keyData)];
        }
        return FMG_Data.empty();
    }

    public get all(): Record<string, FMG_Data> {
        return this._data;
    }

    // public get keys(): FMG_Keys {
    //     if (!this._keys) {
    //         this._keys = new FMG_Keys(this._keyData);
    //     }
    //     return this._keys;
    // }

    /**
     * Checks if data exists for the given key data.
     */
    // public static async exists(
    //     window: Window,
    //     keyData: FMG.Storage.KeyData
    // ): Promise<boolean> {
    //     return !isEmpty(await FMG_Storage.get(window, keyData).data);
    // }

    /**
     * Gets the storage for the given key data.
     * If the storage does not exist, it will be created.
     * Else it will be loaded from the cache.
     * @param window th e window to create the storage for
     * @param keyData the key data to create the storage for
     * @returns the created or loaded storage
     */
    // public static get(window: Window, keyData: FMG.Storage.KeyData) {
    //     const key = FMG_Keys.getV2Key(keyData);
    //     if (!FMG_Storage.storages[key]) {
    //         FMG_Storage.storages[key] = new FMG_Storage(window, keyData);
    //     }
    //     return FMG_Storage.storages[key];
    // }

    /**
     * Removes the storage from the cache.
     * @param keyData the key to build the key from
     */
    // public static unload(keyData: FMG.Storage.KeyData) {
    //     const key = FMG_Keys.getV2Key(keyData);
    //     if (FMG_Storage.storages[key]) {
    //         FMG_Storage.storages[key].save();
    //         delete FMG_Storage.storages[key];
    //     }
    // }

    /**
     * The key of this storage.
     */
    // public get key(): string {
    //     return this.keys.v2Key;
    // }

    /**
     * Loads the data from the storage.
     */
    public async load(): Promise<void> {
        await Promise.all(Object.values(this._data).map((data) => data.load()));
        logger.debug("Loaded storage", this._data);
    }

    /**
     * Saves the data to the storage.
     */
    public async save(): Promise<void> {
        await Promise.all(Object.values(this._data).map((data) => data.save()));
        logger.debug("Saved storage", this._data);
    }

    /**
     * Clear the data from the storage.
     */
    public async clearCurrentMap(): Promise<void> {
        if (!this.window.user || !this.window.mapData) return;

        await this.data.clear();
    }
}
