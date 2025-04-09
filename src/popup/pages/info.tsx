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
            setState(await channel.content.getState());
        }

        fetchState();

        const handle = setInterval(fetchState, 2000);

        return () => clearInterval(handle);
    }, []);

    return (<Info {...state}/>);
}