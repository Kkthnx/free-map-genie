/**
 * Copies text to the clipboard reliably across all major browsers (Chrome, Firefox, Safari, Edge).
 * @param text The string to copy.
 * @returns {Promise<boolean>} True if successful, false if failed.
 */
export default async function clipboard(text: string): Promise<boolean> {
    // 1. Validate input
    if (!text) return false;

    // 2. Try the Modern API (navigator.clipboard)
    // This is the standard for 2024+, but requires a Secure Context (HTTPS)
    // and a direct user gesture (click).
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // If this fails (e.g., HTTP context, permissions denied), we fall through to legacy.
            if (typeof logger !== "undefined") {
                logger.warn("FMG_Clipboard: Clipboard API failed, falling back to legacy execution", err);
            } else {
                console.warn("Clipboard API failed, falling back to legacy execution:", err);
            }
        }
    }

    // 3. Legacy Fallback (document.execCommand)
    // Required for HTTP sites, older browsers, or when permissions fail.
    try {
        const textArea = document.createElement("textarea");

        // Set value
        textArea.value = text;

        // Ensure it's part of the DOM but not visible to the user.
        // Critical: Do NOT use display:none or visibility:hidden, or copy will fail.
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        textArea.setAttribute("readonly", ""); // Prevent keyboard popup on mobile

        document.body.appendChild(textArea);

        // Critical: Select and Focus
        textArea.focus();
        textArea.select();

        // Specifically for iOS/Mobile to ensure full selection
        textArea.setSelectionRange(0, 999999);

        const success = document.execCommand("copy");

        // Cleanup
        document.body.removeChild(textArea);

        if (success) return true;
    } catch (err) {
        if (typeof logger !== "undefined") {
            logger.error("FMG_Clipboard: Legacy copy failed", err);
        } else {
            console.error("Legacy copy failed:", err);
        }
    }

    // 4. Last Resort: User Prompt
    try {
        window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
        return true;
    } catch {
        // Swallow any remaining errors; clipboard is best-effort only.
        return false;
    }
}
