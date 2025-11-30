import { timeout, waitForCallback } from "./async";

function resolveParent(parent?: Window | HTMLElement) {
    if (!parent) {
        return { root: document, target: document };
    }

    if (parent instanceof Window) {
        const doc = parent.document;
        return { root: doc, target: doc.body ?? doc };
    }

    return { root: parent, target: parent };
}

/**
 * Waits for an element to appear in the DOM using MutationObserver.
 */
export function getElement<T extends HTMLElement>(
    selector: string,
    parent?: Window | HTMLElement,
    timeoutTime: number = -1
): Promise<T> {
    const { root, target } = resolveParent(parent);
    const element = root.querySelector(selector);
    if (element) return Promise.resolve(element as T);

    return timeout(
        new Promise<T>((resolve) => {
            const observer = new MutationObserver(() => {
                const node = root.querySelector(selector);
                if (node) {
                    observer.disconnect();
                    resolve(node as T);
                }
            });

            observer.observe(target, { childList: true, subtree: true });
        }),
        timeoutTime,
        `Failed to get element ${selector}.`
    );
}

export function getElements<T extends HTMLElement[]>(
    selector: string,
    parent?: Window | HTMLElement,
    timeoutTime: number = -1
): Promise<T> {
    const { root, target } = resolveParent(parent);
    const elements = root.querySelectorAll(selector);
    if (elements.length) return Promise.resolve([...elements] as T);

    return timeout(
        new Promise<T>((resolve) => {
            const observer = new MutationObserver(() => {
                const nodes = root.querySelectorAll(selector);
                if (nodes.length) {
                    observer.disconnect();
                    resolve([...nodes] as T);
                }
            });

            observer.observe(target, { childList: true, subtree: true });
        }),
        timeoutTime,
        `Failed to get elements ${selector}.`
    );
}

export function getElementWithXPath<T extends HTMLElement>(
    xpath: string,
    win?: Window,
    timeoutTime: number = -1
): Promise<T> {
    return waitForCallback(() => {
        const doc = (win ?? window).document;
        const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return result.singleNodeValue as T;
    }, timeoutTime);
}

export interface CreateScriptOptions {
    src?: string;
    content?: string;
    id?: string;
    appendTo?: HTMLElement;
}

/**
 * Wait for document loaded
 * @param win the window to check.
 * @param timeoutTime reject promise if we are waiting longer then given timeout -1 for no rejection.
 * @returns 
 */
export function documentLoaded(win?: Window, timeoutTime: number = -1): Promise<void> {
    return waitForCallback(() => (win ?? window).document.readyState === "complete", timeoutTime);
}

/**
 * Wait for document loaded
 * @param win the window to check.
 * @param timeoutTime reject promise if we are waiting longer then given timeout -1 for no rejection.
 * @returns 
 */
export async function waitForBody(win?: Window, timeoutTime: number = -1): Promise<void> {
    await waitForCallback(() => !!(win ?? window).document.body, timeoutTime);
}

/**
 * Wait for document loaded
 * @param win the window to check.
 * @param timeoutTime reject promise if we are waiting longer then given timeout -1 for no rejection.
 * @returns 
 */
export async function waitForHead(win?: Window, timeoutTime: number = -1): Promise<void> {
    await waitForCallback(() => !!(win ?? window).document.head, timeoutTime);
}
