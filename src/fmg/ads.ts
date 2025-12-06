
import { waitForCallback } from "@shared/async";

export interface AdBlockerStats {
    totalAdsRemovedThisTick: number;
    totalAdsRemoveLastCoupleTicks: number;
}

export interface OnTickCallback {
    (stats: AdBlockerStats): any;
}

export default class AdBlocker {
    public static REMOVE_CHECK_INTERVAL = 1500;
    private static readonly MAX_TICKS = 20;

    public static totalAdsRemoveLastCoupleTicks: (number | undefined)[] = new Array(10).fill(undefined);

    public static handle: number | null = null;
    public static autoStop: boolean = true;

    private static readonly onTickCallbacks: OnTickCallback[] = [];

    // Helper: Safely remove elements by selector without jQuery
    private static removeBySelector(selector: string): number {
        const elements = document.querySelectorAll(selector);
        let count = 0;
        elements.forEach((el) => {
            el.remove();
            count++;
        });
        return count;
    }

    private static removeIframeAds(): number {
        return this.removeBySelector('iframe[name^="ifrm_"]');
    }

    private static removeGoogleAds(): number {
        return (
            this.removeBySelector('iframe[name*="goog"]') +
            this.removeBySelector('div[id^="google_ads_iframe_"]') +
            this.removeBySelector('iframe[src*="safeframe.googlesyndication"]')
        );
    }

    private static removeNitroAds(): number {
        return this.removeBySelector("#nitro-floating-wrapper");
    }

    private static removeBodyAds(): number {
        return this.removeBySelector('html > iframe[sandbox="allow-scripts allow-same-origin"]');
    }

    private static removeUpgradeProAd(): number {
        let count = 0;

        // Standard buttons from older layouts
        count += this.removeBySelector("#blobby-left");
        count += this.removeBySelector("#button-upgrade");

        // Generic "Upgrade To Pro" CTA (newer layouts, including guide pages)
        const ctaElements = document.querySelectorAll("a, button");
        ctaElements.forEach((el) => {
            const text = el.textContent?.trim().toLowerCase() ?? "";
            if (text.includes("upgrade to pro")) {
                // Remove a slightly higher-level container if possible to clear padding/spacing
                const container =
                    el.closest("div") ??
                    el.parentElement;
                (container ?? el).remove();
                count++;
            }
        });

        // Older banner-style upgrade blocks on some pages
        const banners = document.querySelectorAll(".w-full.text-center.p-2.bg-white");
        banners.forEach((banner) => {
            if (banner.querySelector("a[href*='/upgrade']")) {
                banner.remove();
                count++;
            }
        });

        return count;
    }

    private static removeBlueKai(): number {
        return this.removeBySelector('iframe[name="__bkframe"]');
    }

    private static removePrivacyPopupElement(): number {
        return this.removeBySelector("#onetrust-consent-sdk");
    }

    private static removeAds(): number {
        return (
            this.removeUpgradeProAd() +
            this.removeIframeAds() +
            this.removeGoogleAds() +
            this.removeNitroAds() +
            this.removeBodyAds() +
            this.removeBlueKai()
        );
    }

    public static stats(): AdBlockerStats {
        return Object.seal({
            totalAdsRemovedThisTick: this.totalAdsRemoveLastCoupleTicks[0] ?? 0,
            totalAdsRemoveLastCoupleTicks: this.totalAdsRemoveLastCoupleTicks
                .map((x) => x ?? 0)
                .reduce((a, b) => a + b, 0),
        });
    }

    private static tick() {
        this.totalAdsRemoveLastCoupleTicks.pop();
        this.totalAdsRemoveLastCoupleTicks.unshift(this.removeAds());

        const stats = this.stats();
        this.onTickCallbacks.forEach((cb) => cb(stats));

        const isInitDone = this.totalAdsRemoveLastCoupleTicks.every((x) => x !== undefined);
        const isDone = stats.totalAdsRemoveLastCoupleTicks <= 0
            || this.totalAdsRemoveLastCoupleTicks.filter((x) => x !== undefined).length >= this.MAX_TICKS;

        if (this.autoStop && isInitDone && isDone) {
            logger.debug(`AdBlocker stopped no more ads removed in the last couple ticks.`);
            this.stop();
        }
    }

    public static start() {
        if (this.handle != null) return;
        this.handle = window.setInterval(() => this.tick(), this.REMOVE_CHECK_INTERVAL);
    }

    public static stop() {
        if (!this.handle) return;
        window.clearInterval(this.handle);
        this.handle = null;
    }

    public static onTick(callback: OnTickCallback) {
        this.onTickCallbacks.push(callback);
    }

    public static offTick(callback: OnTickCallback) {
        const i = this.onTickCallbacks.findIndex((cb) => cb === callback);
        if (i >= 0) this.onTickCallbacks.splice(i, 1);
    }

    public static async removePrivacyPopup() {
        if (!__DEBUG__) throw "This should be removed for release builds.";
        // Use vanilla JS selector
        await waitForCallback(() => !!document.querySelector("#onetrust-consent-sdk")).catch(() =>
            logger.debug("Privacy popup not visible.")
        );
    }
}