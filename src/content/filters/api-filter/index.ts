import { FMG_ApiFilter } from "@fmg/filters/api-filter";
import type { FMG_MapManager } from "@fmg/map-manager";
import locations from "./locations";
import categories from "./categories";
import presets from "./presets";
import notes from "./notes";

/**
 * Enhanced API Filter with Pro unlocking capabilities
 * Uses the new Omni-Interceptor (JSON.parse + Fetch + XHR)
 */
export class ContentApiFilter {
    private mapManager: FMG_MapManager;
    public readonly baseFilter: FMG_ApiFilter;

    constructor(window: Window, mapManager: FMG_MapManager, baseFilter: FMG_ApiFilter) {
        this.mapManager = mapManager;
        this.baseFilter = baseFilter;
    }

    /**
     * Register request (delegate to base filter)
     */
    public registerRequest(method: "GET" | "POST" | "PUT" | "DELETE", urlRegex: RegExp, callback: (req: { method: string; url: string }, res: any) => any) {
        this.baseFilter.registerRequest(method, urlRegex, callback);
    }

    /**
     * Register filter (delegate to base filter for backward compatibility)
     */
    public registerFilter<T = any, R = any>(
        method: any,
        key: string,
        hasId: boolean,
        callback: any
    ) {
        this.baseFilter.registerFilter(method, key, hasId, callback);
    }

    /**
     * Install the filter and register specific PRO hacking rules
     */
    public static install(window: Window, mapManager: FMG_MapManager): ContentApiFilter {
        // Install base filter (this hooks JSON.parse, Fetch, and XHR globally)
        const baseFilter = FMG_ApiFilter.install(window);
        
        // Create enhanced filter instance
        const filter = new ContentApiFilter(window, mapManager, baseFilter);
        
        // 1. MOCK USER (Crucial for "Logged Out" Pro Access)
        filter.registerRequest("GET", /\/api\/v1\/user/, (req, res) => {
            logger.log("FMG: Intercepting User Request");
            
            // If the server says "Unauthorized" or returns null, we create a fake Pro user
            if (!res || !res.id) {
                return {
                    id: 88888888,
                    username: "FMG_User",
                    email: "pro@mapgenie.io",
                    role: "admin", // Admin grants all permissions
                    pro: true,
                    entitlements: [],
                    subscription: { active: true, plan: "pro" }
                };
            }

            // If a user exists, just upgrade them
            res.role = "admin";
            res.pro = true;
            if (res.subscription) res.subscription.active = true;
            
            return res;
        });

        // 2. UNLOCK GAME CONFIGS (Unlimited Markers, etc)
        filter.registerRequest("GET", /\/api\/v1\/games\/\w+/, (req, res) => {
            if (res && res.config) {
                res.config.pro = true;
                res.config.presets_enabled = true; // Unlocks presets
                res.config.max_markers = 99999;    // Unlocks marker limit
                res.config.heatmap = true;         // Unlocks heatmaps
            }
            return res;
        });

        // 3. BYPASS PRESET CHECKS
        // Prevents the app from validating if you actually own the presets
        filter.registerRequest("GET", /\/api\/v1\/user\/presets/, (req, res) => {
            if (!res) return [];
            return res.map((p: any) => ({ ...p, access: true }));
        });

        // Setup other filters (locations, categories, presets, notes) - LEGACY API
        // Wait for axios to be available
        if (window.axios) {
            locations(filter, mapManager);
            categories(filter, mapManager);
            presets(filter, mapManager);
            notes(filter, mapManager);
        }

        logger.log("FMG: Content Filters Installed");
        return filter;
    }
}

// Export function for backward compatibility
export function installContentApiFilter(window: Window, mapManager: FMG_MapManager): FMG_ApiFilter {
    const filter = ContentApiFilter.install(window, mapManager);
    // Return the base filter for compatibility
    return filter.baseFilter;
}

// Export default function for backward compatibility
export default function (filter: FMG_ApiFilter, mapManager: FMG_MapManager) {
    locations(filter, mapManager);
    categories(filter, mapManager);
    presets(filter, mapManager);
    notes(filter, mapManager);
}
