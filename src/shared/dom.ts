import { timeout, waitForCallback } from "./async";

function asElement(parent?: Window | HTMLElement) {
    return parent !== undefined
        ? parent instanceof HTMLElement
            ? parent
            : parent.document
        : document;
}

export function getElement<T extends HTMLElement>(
    selector: string,
    parent?: Window | HTMLElement,
    timeoutTime: number = -1
): Promise<T> {
    const parentElement = asElement(parent);
    const element = parentElement.querySelector(selector);
    if (element) return Promise.resolve(element as T);

    if (!parentElement) return Promise.reject(new Error("Parent element not found"));

    return timeout(
        new Promise<T>((resolve) => {
            const observer = new MutationObserver(() => {
                const node = parentElement.querySelector(selector);
                if (node) {
                    observer.disconnect();
                    resolve(node as T);
                }
            });

            observer.observe(
                parentElement instanceof Window ? parentElement.document : parentElement,
                { childList: true, subtree: true }
            );
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
    const parentElement = asElement(parent);
    const elements = parentElement.querySelectorAll(selector);
    if (elements.length > 0) return Promise.resolve([...elements] as T);

    return timeout(
        new Promise<T>((resolve) => {
            const observer = new MutationObserver(() => {
                const nodes = parentElement.querySelectorAll(selector);
                if (nodes.length > 0) {
                    observer.disconnect();
                    resolve([...nodes] as T);
                }
            });

            observer.observe(
                parentElement instanceof Window ? parentElement.document : parentElement,
                { childList: true, subtree: true }
            );
        }),
        timeoutTime,
        `Failed to get element ${selector}.`
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
