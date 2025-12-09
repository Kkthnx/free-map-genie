import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

import type { FMG_MapManager } from "@fmg/map-manager";
import type FMG_Data from "@fmg/storage/data";

type MinifiedNote = {
    x: number;
    y: number;
    d: string;
    t?: string;
    c?: string | null;
    m: number;
};

const COORD_PRECISION = 5;
const COORD_TOLERANCE = 10 ** -COORD_PRECISION;

function toNumber(value: string | number): number {
    return typeof value === "number" ? value : Number(value);
}

function generateNoteId(): string {
    return [
        "fmg-share",
        Date.now().toString(36),
        Math.random().toString(36).slice(2, 8)
    ].join("-");
}

export function minifyNote(note: MG.Note): MinifiedNote {
    const lat = toNumber(note.latitude);
    const lng = toNumber(note.longitude);

    return {
        x: Number(lat.toFixed(COORD_PRECISION)),
        y: Number(lng.toFixed(COORD_PRECISION)),
        d: note.description,
        t: note.title || undefined,
        c: note.color ?? null,
        m: note.map_id
    };
}

export function expandNote(minified: MinifiedNote, userId: number): MG.Note {
    return {
        id: generateNoteId(),
        map_id: minified.m,
        user_id: userId,
        title: minified.t ?? "",
        description: minified.d,
        color: minified.c ?? null,
        latitude: minified.x,
        longitude: minified.y,
        category: null
    };
}

export function generateShareUrlForNote(note: MG.Note, url: URL): string {
    const minified = minifyNote(note);
    const json = JSON.stringify(minified);
    const compressed = compressToEncodedURIComponent(json);

    url.searchParams.set("fmg_note", compressed);
    return url.toString();
}

export function parseSharedNoteFromUrl(url: URL): MinifiedNote | null {
    const encoded = url.searchParams.get("fmg_note");
    if (!encoded) return null;

    try {
        const decompressed = decompressFromEncodedURIComponent(encoded);
        if (!decompressed) return null;
        const parsed = JSON.parse(decompressed) as MinifiedNote;
        if (
            typeof parsed.x !== "number" ||
            typeof parsed.y !== "number" ||
            typeof parsed.d !== "string" ||
            typeof parsed.m !== "number"
        ) {
            return null;
        }
        return parsed;
    } catch (err) {
        logger.error("FMG_Share: Failed to parse shared note from URL", err);
        return null;
    }
}

function notesEqual(a: MG.Note, b: MG.Note): boolean {
    const ax = toNumber(a.latitude);
    const ay = toNumber(a.longitude);
    const bx = toNumber(b.latitude);
    const by = toNumber(b.longitude);

    return (
        Math.abs(ax - bx) <= COORD_TOLERANCE &&
        Math.abs(ay - by) <= COORD_TOLERANCE &&
        a.description === b.description
    );
}

export async function importSharedNoteFromUrl(
    window: Window,
    mapManager: FMG_MapManager
): Promise<boolean> {
    const url = new URL(window.location.href);
    const minified = parseSharedNoteFromUrl(url);
    const mapId = window.mapData?.map.id;
    const userId = window.user?.id ?? -1;

    if (!minified) {
        return false;
    }

    if (typeof mapId !== "number") {
        logger.warn("FMG_Share: Shared note found but mapId is not available, skipping import");
        return false;
    }

    if (minified.m !== mapId) {
        logger.warn(
            "FMG_Share: Shared note map_id does not match current map, skipping import",
            { sharedMapId: minified.m, currentMapId: mapId }
        );
        return false;
    }

    const storageData: FMG_Data = mapManager.storage.data;
    const previous = storageData.snapshot();

    const note = expandNote(minified, userId);

    const exists = storageData.notes.some((n) => notesEqual(n, note));
    if (exists) {
        logger.debug("FMG_Share: Shared note already exists in storage, skipping import");
    } else {
        storageData.notes.push(note);
        await storageData.save();
        await mapManager.reload(previous);
        logger.info("FMG_Share: Shared note imported from URL", note);
    }

    // Clean URL to avoid re-import on refresh
    url.searchParams.delete("fmg_note");
    window.history.replaceState({}, window.document.title, url.toString());

    // Provide basic UI feedback without forcing reload; MapManager.reload already updated the map
    if (typeof toastr !== "undefined") {
        toastr.success("Shared note imported");
    }

    return !exists;
}

