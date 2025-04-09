export async function getLatestVersion() {
    const url = new URL("https://raw.githubusercontent.com");
    url.pathname = new URL(__HOMEPAGE__).pathname + "/main/package.json";

    const res = await fetch(url.toString());
    const json = await res.json();

    logger.debug("fetch Package.json @", url.toString(), "| Data:", json);

    return json.version as string;
}

export function getCurrentVersion() {
    return __VERSION__;
}

export function getCurrentVersionName() {
    return __VERSION__ + (__DEBUG__ ? "-dev" : "");
}

export function compareVersions(a: string, b: string): number {
    const [aParts, bParts] = [a, b].map((v) =>
        v.split(".").map((p) => parseInt(p.match(/\d+/)?.[0] || "0"))
    );
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        if (aPart > bPart) return 1;
        if (aPart < bPart) return -1;
    }
    return 0;
}

export async function needsUpdate(latest?: string) {
    latest ??= await getLatestVersion();
    const current = getCurrentVersion();
    
    logger.debug("Current version:", current);
    logger.debug("Latest version:", latest);

    return compareVersions(latest, current) > 0;
}