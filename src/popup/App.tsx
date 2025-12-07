import React from "react";
import toastr from "toastr";

import channel from "@shared/channel/popup";

import ThemeProvider from "@components/ThemeProvider";
import TabView from "@components/TabView";
import IconButton from "@components/IconButton";

import Connection from "./components/Connection";
import Version from "./components/Version";

import BookmarksPage from "./pages/bookmarks";
import SettingsPage from "./pages/settings";
import InfoPage from "./pages/info";

import "./app.scss";

window.toastr = toastr;

export default function App() {

    const [connected, setConnected] = React.useState(false);

    React.useEffect(() => {
        async function checkConnection() {
            try {
                await channel.extension.hello(void 0, 2000);
                setConnected(true);
            } catch {
                setConnected(false);
            }
        }

        const handle = setInterval(() => checkConnection(), 2000);

        checkConnection();

        return () => clearInterval(handle);
    }, []);

    function reloadExtension() {
        chrome.runtime.reload();
    }

    function openMapGenie() {
        chrome.tabs.create({ url: "https://mapgenie.io/" });
    }

    function openHomepage() {
        chrome.tabs.create({ url: __HOMEPAGE__ });
    }

    function closePopup() {
        window.close();
    }

    return (
        <ThemeProvider theme="dark">
            <div className="container">
                <div className="header">
                    <div className="left">
                        <IconButton
                            size="20px"
                            icon="reload"
                            onClick={reloadExtension}
                            title="Reload the extension"
                        />
                        <IconButton
                            size="20px"
                            icon="g"
                            onClick={openMapGenie}
                            title="Open MapGenie website"
                        />
                    </div>
                    <div className="center">
                        <div className="title">
                            <span className="bold">Map</span>
                            <span className="light">Genie</span>
                            <sup className="pro">PRO</sup>
                        </div>
                    </div>
                    <div className="right">
                        <IconButton
                            className="close"
                            size="30px"
                            icon="cancel"
                            onClick={closePopup}
                            title="Close this window"
                        />
                    </div>
                </div>
                <TabView page={"settings"}>
                    <TabView.Page name="bookmarks" icon="bookmark">
                        <BookmarksPage connected={connected} />
                    </TabView.Page>
                    <TabView.Page name="settings" icon="cog">
                        <SettingsPage />
                    </TabView.Page>
                    <TabView.Page name="info" icon="doc">
                        <InfoPage />
                    </TabView.Page>
                </TabView>
                <div className="footer">
                    <div className="left">
                        <span className="author" onClick={openHomepage}>{__AUTHOR__}</span>
                    </div>
                    <div className="center">
                        <Connection connected={connected} />
                    </div>
                    <div className="right">
                        <Version />
                    </div>
                </div>
            </div>
        </ThemeProvider>
    )
}