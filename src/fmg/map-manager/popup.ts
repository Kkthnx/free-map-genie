import type { FMG_MapManager } from ".";
import clipboard from "@shared/clipboard";
import { generateShareUrlForNote } from "@fmg/share";

export class FMG_Popup {
    public instance: MG.Popup;
    private mapManager: FMG_MapManager;

    private get color() {
        return "#71e189";
    }

    private get title() {
        return "FMG Link Copied";
    }

    constructor(popup: MG.Popup, mapManager: FMG_MapManager) {
        this.instance = popup;
        this.mapManager = mapManager;

        this.fixLocationPermaLink();
        this.injectShareNoteButton();
    }

    private fixLocationPermaLink(): void {
        // Only fix location link if we are on a pro unlocked map.
        if (!new URL(window.location.href).searchParams.has("map")) return;

        const parent = this.instance._content;
        const link = parent.querySelector<HTMLElement>("i.ion-ios-link");
        const fmgLink = link?.cloneNode(true) as HTMLElement | undefined;

        // If we don't have a link or a fmg link, we can't fix it.
        if (!link || !fmgLink) return;

        fmgLink.setAttribute("data-title", this.title);
        fmgLink.style.color = this.color;
        fmgLink.addEventListener("click", () => {
            clipboard(this.createHref(this.instance.locationId));
            this.showPopup(fmgLink);
        });
        link.after(fmgLink);
    }

    /**
     * Creates a fmg map href link
     * @param locationId the location id to link to
     */
    private createHref(locationId: Id): string {
        const url = new URL(window.location.href);
        url.searchParams.set("locationIds", locationId + "");
        return url.toString();
    }

    private findNoteForPopup(): MG.Note | undefined {
        const notes = this.mapManager.storage.data.notes;
        if (!notes.length) return;

        const lngLat = this.instance._lngLat;
        const lat = lngLat?.lat;
        const lng = lngLat?.lng;

        if (typeof lat !== "number" || typeof lng !== "number") return;

        // Use a slightly relaxed tolerance to account for any rounding
        // differences between stored note coordinates and popup coordinates.
        const TOLERANCE = 1e-4;

        return notes.find((note) => {
            const nLat = typeof note.latitude === "number" ? note.latitude : Number(note.latitude);
            const nLng = typeof note.longitude === "number" ? note.longitude : Number(note.longitude);

            if (Number.isNaN(nLat) || Number.isNaN(nLng)) return false;

            return (
                Math.abs(nLat - lat) <= TOLERANCE &&
                Math.abs(nLng - lng) <= TOLERANCE
            );
        });
    }

    /**
     * Inject a "Share Note" icon into the popup which generates
     * a URL-encoded representation of the note and copies it.
     * This mirrors the native MapGenie permalink icon styling.
     */
    private injectShareNoteButton(): void {
        const parent = this.instance._content;
        if (!parent) return;

        if (parent.querySelector(".fmg-share-note-icon")) return;

        // Only show the share control when we can resolve a corresponding FMG note.
        if (!this.findNoteForPopup()) return;

        // Reuse the existing MapGenie permalink icon for consistent styling
        const baseIcon = parent.querySelector<HTMLElement>("i.permalink.icon.ion-ios-link");
        const shareIcon = baseIcon?.cloneNode(true) as HTMLElement | undefined;

        if (!baseIcon || !shareIcon) return;

        shareIcon.classList.add("fmg-share-note-icon");
        const defaultTitle = "Share FMG note link";
        const copiedTitle = "Link Copied";
        // Tooltip used by MapGenie + native browser tooltip.
        shareIcon.setAttribute("data-title", defaultTitle);
        shareIcon.setAttribute("title", defaultTitle);
        shareIcon.style.color = this.color;

        shareIcon.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            // Only allow sharing when we can resolve a corresponding FMG note
            // from local storage for this popup.
            const note = this.findNoteForPopup();
            if (!note) {
                alert("FMG: This marker is not an FMG note or has not been saved yet, so it cannot be shared.");
                return;
            }

            const url = new URL(window.location.href);
            const shareUrl = generateShareUrlForNote(note, url);

            // Fire-and-forget; clipboard() is best-effort and handles all fallbacks.
            void clipboard(shareUrl);

            // Temporarily show a "Link Copied" tooltip to match the
            // native MapGenie permalink behaviour, then restore the
            // default tooltip text for subsequent hovers.
            const previousTitle = shareIcon.getAttribute("data-title") || defaultTitle;
            shareIcon.setAttribute("data-title", copiedTitle);
            shareIcon.setAttribute("title", copiedTitle);

            this.showPopup(shareIcon);

            setTimeout(() => {
                shareIcon.setAttribute("data-title", previousTitle);
                shareIcon.setAttribute("title", previousTitle);
            }, 2000);
        });

        baseIcon.after(shareIcon);
    }

    /**
     * Shows a tooltip-style popup for a link, if the underlying
     * page has a tooltip implementation available. Falls back
     * silently when not available.
     * @param link the link to show the popup for
     */
    private showPopup(link: HTMLElement) {
        const anyWin = window as any;
        const $fn = (anyWin.$ || anyWin.jQuery) as ((el: HTMLElement) => any) | undefined;

        if ($fn) {
            const $link = $fn(link);
            if (typeof $link.tooltip === "function") {
                $link.tooltip("show");
                setTimeout(() => $link.tooltip("hide"), 2000);
                return;
            }
        }

        // If no tooltip implementation is available, do nothing.
        // The title attribute on the icon still provides a native tooltip.
    }
}
