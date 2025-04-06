import FMG_Keys from "./keys";

type Prop = string | symbol;

function asId(prop: string | Symbol): number {
    const id = Number(prop);
    if (Number.isNaN(id)) {
        throw new TypeError(`Property ${String(prop)} is not a number`);
    }
    return id;
}

class IdSetProxyHandler implements ProxyHandler<Set<Number>> {

    get(target: Set<Number>, prop: Prop) {
        const id = asId(prop);
        return target.has(id);
    }

    set(target: Set<Number>, prop: Prop, value: boolean) {
        const id = asId(prop);
        if (value) {
            target.add(id);
        } else {
            target.delete(id);
        }
        return true;
    }

    deleteProperty(target: Set<Number>, prop: Prop) {
        const id = asId(prop);
        target.delete(id);
        return true;
    }

    has(target: Set<Number>, prop: Prop) {
        const id = asId(prop);
        return target.has(id);
    }

    ownKeys(target: Set<Number>): ArrayLike<Prop> {
        return [...target.values()].map(String);
    }

    public getOwnPropertyDescriptor(target: Set<Number>, prop: Prop): PropertyDescriptor | undefined {
        if (typeof prop === "string") {
            const id = asId(prop);
            return {
                value: target.has(id),
                enumerable: true,
                configurable: true
            };
        }
    }
}

function idSetAsDictByIdBoolean(set: Set<number>): DictById<boolean> {
    return new Proxy(set, IdSetProxyHandler.prototype) as any as DictById<boolean>;
}

export default class FMG_Data {
    public readonly keyData?: FMG.Storage.KeyData;
    public readonly driver?: FMG.Storage.Driver;
    public readonly key?: string;

    private _locationsSet: Set<number>;
    private _categoriesSet: Set<number>;
    private _visibleCategoriesSet: Set<number>;

    private _locations: DictById<boolean>;
    private _categories: DictById<boolean>;
    private _visibleCategories: DictById<boolean>;

    public notes: MG.Note[];
    public presets: MG.Preset[];
    public presetOrder: number[];

    private constructor(keyData?: FMG.Storage.KeyData, driver?: FMG.Storage.Driver) {
        this.keyData = keyData;
        this.driver = driver;

        this.key = keyData ? FMG_Keys.getV2Key(keyData) : undefined;

        this._locationsSet = new Set();
        this._categoriesSet = new Set();
        this._visibleCategoriesSet = new Set();

        this._locations = idSetAsDictByIdBoolean(this._locationsSet);
        this._categories = idSetAsDictByIdBoolean(this._categoriesSet);
        this._visibleCategories = idSetAsDictByIdBoolean(this._visibleCategoriesSet);

        this.notes = [];
        this.presets = [];
        this.presetOrder = [];
    }

    public static new(key: FMG.Storage.KeyData, driver: FMG.Storage.Driver) {
        return new FMG_Data(key, driver);
    }

    public static empty() {
        return new FMG_Data()
    }

    public get locations() {
        return this._locations;
    }

    public set locations(newLocations: DictById<boolean>) {
        this._locationsSet = new Set(Object.keys(newLocations).map(Number));
        this._locations = idSetAsDictByIdBoolean(this._locationsSet);
    }

    public get categories() {
        return this._categories;
    }

    public set categories(newCategories: DictById<boolean>) {
        this._categoriesSet = new Set(Object.keys(newCategories).map(Number));
        this._categories = idSetAsDictByIdBoolean(this._categoriesSet);
    }

    public get visibleCategories() {
        return this._visibleCategories;
    }

    public set visibleCategories(newVisibleCategories: DictById<boolean>) {
        this._visibleCategoriesSet = new Set(Object.keys(newVisibleCategories).map(Number));
        this._visibleCategories = idSetAsDictByIdBoolean(this._visibleCategoriesSet);
    }

    public get locationIds() {
        return Array.from(this._locationsSet);
    }

    public get categoryIds() {
        return Array.from(this._categoriesSet);
    }

    public get visibleCategoriesIds() {
        return Array.from(this._visibleCategoriesSet);
    }

    public get isEmpty() {
        return (this._locationsSet.size 
            + this._categoriesSet.size
            + this._visibleCategoriesSet.size
            + this.notes.length
            + this.presets.length
        ) <= 0;
    }

    public async save() {
        if (!this.key || !this.driver) return;

        const data: Partial<FMG.Storage.V2.StorageObject> = {};

        if (this._locationsSet.size) {
            data.locationIds = this.locationIds;
        }

        if (this._categoriesSet.size) {
            data.categoryIds = this.categoryIds;
        }

        if (this._visibleCategoriesSet.size) {
            data.visibleCategoriesIds = this.visibleCategoriesIds;
        }

        if (this.presets.length) {
            data.presets = this.presets;
            data.presetOrder = this.presetOrder;
        }

        if (this.notes.length) {
            data.notes = this.notes;
        }

        if (this.isEmpty) {
            await this.driver.remove(this.key);
        } else {
            await this.driver.set<FMG.Storage.V2.StorageObject>(this.key, data);
        }
    }

    // TODO: check if loaded data is valid
    public async load() {
        if (!this.key || !this.driver) return;

        const data = await this.driver.get<FMG.Storage.V2.StorageObject>(this.key);

        this._locationsSet = new Set(data?.locationIds ?? []);
        this._categoriesSet = new Set(data?.categoryIds ?? []);
        this._visibleCategoriesSet = new Set(data?.visibleCategoriesIds ?? []);

        this._locations = idSetAsDictByIdBoolean(this._locationsSet);
        this._categories = idSetAsDictByIdBoolean(this._categoriesSet);
        this._visibleCategories = idSetAsDictByIdBoolean(this._visibleCategoriesSet);

        this.notes = data?.notes ?? [];
        this.presets = data?.presets ?? [];
        this.presetOrder = data?.presetOrder ?? [];
    }

    public async clear() {
        if (!this.key || !this.driver) return;

        await this.driver.remove(this.key);
        await this.load();
    }
}