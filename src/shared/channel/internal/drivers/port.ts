/// <reference types="chrome" />

import { encodeConnectionArgs } from "../connection-args";
import type { ChannelDriver, DriverState, Fingerprint } from "../types";

export type Listener = (message: any) => any;

export default function createPortChannelDriver(name: string, fingerprint: Fingerprint) {
    let state: DriverState = "disconnected";
    let port: chrome.runtime.Port;

    const listeners: Set<Listener> = new Set();

    const handleMessage = (message: any) => {
        listeners.forEach((cb) => cb(message));
    };

    const connect = () => {
        // Fix: Access lastError to suppress "Unchecked runtime.lastError" when this
        // function is triggered by an unexpected port disconnection (e.g. bfcache).
        const _ = chrome.runtime.lastError;

        state = "connected";

        port = chrome.runtime.connect({
            name: encodeConnectionArgs({
                context: name,
                fingerprint,
            }),
        });

        port.onMessage.addListener(handleMessage);
        port.onDisconnect.addListener(connect);
    };

    const disconnect = () => {
        state = "disconnected";

        listeners.clear();
        port.onMessage.removeListener(handleMessage);
        port.onDisconnect.removeListener(connect);
        port.disconnect(); // Explicitly disconnect the port instance
    };

    return {
        onMessage(cb) {
            listeners.add(cb);
        },
        postMessage(message) {
            if (state === "disconnected") throw "Not connected yet.";

            port.postMessage(message);
        },
        connect,
        disconnect,
        get state() {
            return state;
        },
    } satisfies ChannelDriver;
}
