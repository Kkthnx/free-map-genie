import Icon from "@components/Icon";
import { needsUpdate, getLatestVersion, getCurrentVersion, getCurrentVersionName } from "@shared/version";
import React from "react";

import "./version.scss";

export default function Version() {
    const version = getCurrentVersionName();
    
    const [latest, setLatest] = React.useState(getCurrentVersion());
    const [updateNeeded, setUpdateNeeded] = React.useState(false);

    React.useEffect(() => {
        async function checkUpdateNeeded() {
            setUpdateNeeded(await needsUpdate(latest));
        }
        checkUpdateNeeded();
    }, [latest])

    React.useEffect(() => {
        async function fetchLatestVersion() {
            setLatest(await getLatestVersion());
        }
        fetchLatestVersion();
    }, []);

    function onVersionClick() {
        chrome.tabs.create({
            url: __HOMEPAGE__ + "/releases"
        });
    }

    return (
        <div className="version">
            {
                updateNeeded
                    ? (
                        <span
                            className="warning"
                            data-message={`New version available ${latest}`}
                            onClick={onVersionClick}
                        >
                            <Icon icon="attention" size="0.8rem" />
                        </span>
                    )
                    : undefined
            }
            <span>v{ version }</span>
        </div>
    );
}