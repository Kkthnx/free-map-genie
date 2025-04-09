import { className } from "@shared/react";

import channel from "@shared/channel/popup";

import Icon from "@components/Icon";

import "./connection.scss";

export interface ConnectionProps {
    connected: boolean;
}

export default function Connection({ connected }: ConnectionProps) {

    async function reloadActiveTab() {
        await channel.background.reloadActiveTab();
    }

    return (
        <span className={className("connection", { connected })}>
            {
                connected
                    ? <>connected</>
                    : <>
                        <Icon
                            icon="reload"
                            size="0.8rem"
                            onClick={reloadActiveTab}>    
                        </Icon>
                        disconnected
                    </>
            }
        </span>
    )
}