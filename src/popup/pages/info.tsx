import Info from "@components/Info";

import channel from "@shared/channel/popup";
import React from "react";

import type { State } from "@/content";

export default function InfoPage() {

    const [state, setState] = React.useState<State>({
        type: "unknown",
        user: "n/a",
    });

    React.useEffect(() => {
        async function fetchState() {
            try {
                const nextState = await channel.content.getState();
                setState(nextState);
            } catch (err) {
                // If the content script is not available (e.g. popup opened on a
                // non-MapGenie tab) or the channel times out, just keep the last
                // known state and log a warning instead of throwing.
                logger.warn("FMG_Popup: Failed to get state from content script", err);
            }
        }

        fetchState();

        const handle = setInterval(fetchState, 2000);

        return () => clearInterval(handle);
    }, []);

    return (<Info {...state} />);
}