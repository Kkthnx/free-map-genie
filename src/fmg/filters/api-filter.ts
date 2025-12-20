import { blockable, type BlockableCallback } from "@shared/async";

export type ApiFilteredCallback<T = any, R = any> = BlockableCallback<
    undefined | void | R,
    [string, string, string, T, string]
>;

export const AxiosMethods = ["get", "put", "post", "delete"] as const;

export type AxiosMethod = (typeof AxiosMethods)[number];

export type AxiosMethodAndAny = AxiosMethod | "any";

export interface ApiMethodFilter {
    regex: RegExp;
    callback: ApiFilteredCallback;
}

export interface ApiMethodFilterGroup {
    [key: string]: ApiMethodFilter;
}

export const ApiFiltered = Symbol("ApiFiltered");

export interface AxiosExtended extends Lib.Axios {
    [ApiFiltered]?: FMG_ApiFilter;
}

// NEW API Types
export type ApiRequestType = "GET" | "POST" | "PUT" | "DELETE";
export type ApiCallback = (req: { method: string; url: string }, res: any) => any;

/**
 * Filter api requests - Enhanced with JSON.parse hook and Fetch support
 */
export class FMG_ApiFilter {
    private axios: AxiosExtended;
    private filters: Record<AxiosMethodAndAny, ApiMethodFilterGroup>;
    private _window: Window;
    private _callbacks: Record<string, ApiCallback[]> = {};

    protected constructor(axios: AxiosExtended, window: Window) {
        this.axios = axios;
        this._window = window;
        this.filters = {} as Record<AxiosMethodAndAny, ApiMethodFilterGroup>;

        AxiosMethods.forEach((method) => {
            this.filters[method] = {};
            this.createProxyMethod(method);
        });
        this.filters.any = {};

        logger.log("Api Filter Installed");
    }

    /**
     * NEW API: Register a simple request/response filter
     */
    public registerRequest(method: ApiRequestType, urlRegex: RegExp, callback: ApiCallback) {
        const key = `${method}:${urlRegex.source}`;
        if (!this._callbacks[key]) this._callbacks[key] = [];
        this._callbacks[key].push(callback);
        logger.log(`Registered request filter for ${method} ${urlRegex}`);
    }

    /**
     * Process data through registered request callbacks
     * Made public so Fetch/XHR interceptors can use it
     */
    public processData(method: string, url: string, data: any): any {
        for (const key in this._callbacks) {
            const [cbMethod, cbRegex] = key.split(":");
            if (cbMethod === method && new RegExp(cbRegex).test(url)) {
                for (const cb of this._callbacks[key]) {
                    try {
                        data = cb({ method, url }, data) || data;
                    } catch (err) {
                        logger.error("FMG: Filter Error", err);
                    }
                }
            }
        }
        return data;
    }

    /**
     * Install the api filter on the given window object
     * @param window the window object containing the axios object
     * @returns the installed api filter
     */
    public static install(window: Window): FMG_ApiFilter {
        const global = window as any;
        
        // If already installed, return existing instance
        if (window.axios && window.axios[ApiFiltered]) {
            return window.axios[ApiFiltered];
        }

        // 1. JSON.parse Proxy (The "God Mode" Hook)
        // Catches data from localStorage, API responses, and embedded script tags.
        if (!global.__fmgJsonParseInstalled) {
            const originalParse = JSON.parse;
            JSON.parse = function (text: string, reviver?: (this: any, key: string, value: any) => any) {
                const data = originalParse(text, reviver);
                try {
                    if (data && typeof data === "object") {
                        // Patch User Object wherever it appears
                        if (data.user && data.user.id) {
                            data.user.pro = true;
                            data.user.role = "admin";
                        }
                        // Patch Direct User Object (sometimes returned as root)
                        if (data.id && data.username && data.role !== undefined) {
                            data.pro = true;
                            data.role = "admin";
                        }
                        // If user is null/undefined in response, inject mock user
                        // This handles cases where the API returns { user: null } or {}
                        if (data.user === null || data.user === undefined) {
                            data.user = {
                                id: 88888888,
                                username: "FMG_User",
                                email: "pro@mapgenie.io",
                                role: "admin",
                                pro: true,
                                entitlements: [],
                                subscription: { active: true, plan: "pro" }
                            };
                        }
                        // Patch Game Configs
                        if (data.config && data.config.presets_enabled !== undefined) {
                            data.config.pro = true;
                            data.config.presets_enabled = true;
                        }
                    }
                } catch (e) { /* Ignore errors during patching */ }
                return data;
            };
            global.__fmgJsonParseInstalled = true;
            logger.log("FMG: JSON.parse hook installed");
        }

        // 2. Fetch Proxy (Modern API)
        if (!global.__fmgFetchInstalled) {
            const originalFetch = window.fetch;
            window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
                const response = await originalFetch(input, init);
                const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
                const method = (init?.method || "GET").toUpperCase();

                if (url.includes("/api/") || url.includes("mapgenie.io")) {
                    // Handle 401/403 errors by converting them to success with mock user
                    if (response.status === 401 || response.status === 403) {
                        if (url.includes("/api/v1/user")) {
                            const mockUser = {
                                id: 88888888,
                                username: "FMG_User",
                                email: "pro@mapgenie.io",
                                role: "admin",
                                pro: true,
                                entitlements: [],
                                subscription: { active: true, plan: "pro" }
                            };
                            return new Response(JSON.stringify(mockUser), {
                                status: 200,
                                statusText: "OK",
                                headers: response.headers
                            });
                        }
                    }
                    
                    const clone = response.clone();
                    try {
                        const data = await clone.json();
                        // Process through registered filters if filter exists
                        let modified = data;
                        // Try to get filter instance (may not exist yet if axios isn't ready)
                        const filterInstance = window.axios && window.axios[ApiFiltered];
                        if (filterInstance && filterInstance.processData) {
                            modified = filterInstance.processData(method, url, data);
                        }
                        
                        // Rewrite response with hacked data
                        return new Response(JSON.stringify(modified), {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers
                        });
                    } catch { /* Not JSON */ }
                }
                return response;
            };
            global.__fmgFetchInstalled = true;
            logger.log("FMG: Fetch proxy installed");
        }

        // 3. XMLHttpRequest Proxy (Legacy API)
        if (!global.__fmgXHRInstalled) {
            const OriginalXHR = window.XMLHttpRequest;
            class ProxiedXHR extends OriginalXHR {
                _url = "";
                _method = "";
                
                open(method: string, url: string, ...args: any[]) {
                    this._method = method;
                    this._url = url;
                    super.open(method, url, ...args as [any, any]);
                }

                get responseText() {
                    const txt = super.responseText;
                    // Let JSON.parse handle the patching, or do specific URL filtering here
                    if (this._url.includes("/api/") && txt) {
                        try {
                            const json = JSON.parse(txt); // This triggers our Hook #1 automatically!
                            // Process through registered filters if filter exists
                            let modified = json;
                            if (window.axios && window.axios[ApiFiltered]) {
                                modified = (window.axios[ApiFiltered] as any).processData(this._method, this._url, json);
                            }
                            return JSON.stringify(modified);
                        } catch {}
                    }
                    return txt;
                }
            }
            (window as any).XMLHttpRequest = ProxiedXHR;
            global.__fmgXHRInstalled = true;
            logger.log("FMG: XMLHttpRequest proxy installed");
        }

        // Now install axios filter if axios exists
        let filter: FMG_ApiFilter;
        if (!window.axios) {
            // Create a minimal filter instance that will work until axios is available
            // The hooks (JSON.parse, Fetch, XHR) are already installed and will work
            filter = {
                processData: (method: string, url: string, data: any) => data,
                registerRequest: () => {},
                registerFilter: () => {},
                unregisterFilter: () => {}
            } as any;
            logger.warn("FMG: axios not available, filter will be fully initialized later");
        } else {
            if (!window.axios[ApiFiltered]) {
                filter = new FMG_ApiFilter(window.axios, window);
                window.axios[ApiFiltered] = filter;
            } else {
                filter = window.axios[ApiFiltered];
            }
        }

        logger.log("FMG: Omni-Interceptor Installed (JSON + Fetch + XHR)");
        return filter;
    }

    /**
     * Get the filter group for the given method and url
     * @param method the axios method
     * @param url the url to check
     * @returns the filter group, or undefined if no filter group was found
     */
    private getFilter(
        method: AxiosMethod,
        url: string
    ): ApiMethodFilter | undefined {
        // First check if there is a filter for the given method and key
        for (const group in this.filters[method]) {
            if (this.filters[method][group].regex.test(url)) {
                return this.filters[method][group];
            }
        }

        // Then check if there is a filter for the any method and key
        for (const group in this.filters.any) {
            if (this.filters.any[group].regex.test(url)) {
                return this.filters.any[group];
            }
        }

        return;
    }

    /**
     * Create a proxy method for the given axios method
     * @param method the axios method
     * @returns the proxy method
     */
    private createProxyMethod(method: AxiosMethod): void {
        const axiosMethod = this.axios[method];
        this.axios[method] = ((...args: any[]) => {
            const [requestUrl, data] = args;

            if (!requestUrl.startsWith("/api/v1"))
                return axiosMethod.apply(this.axios, args as any);

            const url = new URL(
                (this.axios.defaults.baseURL ?? "") + requestUrl
            );

            // We only care about the API path when matching, not the origin.
            // Our regexes are written against "/api/v1/..." paths.
            const path = url.pathname;

            const group = this.getFilter(method, path);
            const { key, id } = group?.regex.exec(path)?.groups ?? {};

            return blockable<any, [string, string, string, any, string]>(
                group?.callback || (() => {}),
                method,
                key,
                id,
                data,
                requestUrl
            )
                .then((newData) =>
                    axiosMethod.apply(this.axios, [
                        requestUrl,
                        newData ?? data,
                        ...args.slice(2)
                    ] as any)
                )
                .catch(blockable.catcher);
        }) as any;
    }

    /**
     * Compile the given key to a regex
     * @param key the key to compile
     * @returns the compiled regex
     */
    private static compileKeyToRegex(key: string, hasId: boolean): RegExp {
        return new RegExp(
            "/api/v1/user/" +
                `(?<key>${key})` +
                (hasId ? "/(?<id>[\\d\\w_-]+)" : "") +
                "$"
        );
    }

    /**
     * Register filter (LEGACY API - maintained for backward compatibility)
     * @param method
     * @param key
     * @param callback
     *
     * @throws Error if the filter already exists
     * @template T the type of the data
     */
    public registerFilter<T = any, R = any>(
        method: AxiosMethodAndAny,
        key: string,
        hasId: boolean,
        callback: ApiFilteredCallback<T, R>
    ) {
        // Check if the filter already exists
        if (this.filters[method][key]) {
            // If the filter already exists, throw an error
            throw new Error(`Filter already exists for ${method} ${key}`);
        } else {
            // If the filter doesn't exist, create it
            this.filters[method][key] = {
                regex: FMG_ApiFilter.compileKeyToRegex(key, hasId),
                callback: callback
            };
        }
    }

    /**
     * Unregister the filter for the given method and key
     * @param method the axios method
     * @param key the key to unregister
     */
    public unregisterFilter(method: AxiosMethod, key: string) {
        // Check if the filter exists
        if (this.filters[method][key]) {
            // If the filter exists, delete it
            delete this.filters[method][key];
        } else {
            // If the filter doesn't exist, throw an error
            throw new Error(`Filter does not exist for ${method} ${key}`);
        }
    }
}
