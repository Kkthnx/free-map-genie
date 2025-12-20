interface Window {
    axios?: Lib.Axios;
    toastr?: Lib.Toastr;

    // User object (can be real or mocked)
    user?: {
        id: number;
        username?: string;
        email?: string;
        role: string;
        pro: boolean;
        subscription?: {
            active: boolean;
            plan: string;
        };
        entitlements?: any[];
        // ... other props
    };

    // Map globals
    isEditor?: boolean;
    isMini?: boolean;

    fmgMapManager?: import("@fmg/map-manager").FMG_MapManager;

    mapManager?: MG.MapManager;
    map?: MG.Map;

    // Guide globals
    mapElement?: HTMLIFrameElement;
}
