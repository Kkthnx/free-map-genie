import Bookmarks from "@components/Bookmarks";

import channel from "@shared/channel/popup";
import React from "react";

export interface BookmarksPageProps {
    connected: boolean;
}

export default function BookmarksPage({ connected }: BookmarksPageProps) {

    const [bookmarks, _setBookmarks] = React.useState<FMG.Extension.BookmarkData[]>([]);

    React.useEffect(() => {
        async function fetchBookmarks() {
            _setBookmarks(await channel.offscreen.getBookmarks());
        }
        fetchBookmarks();
    }, []);

    async function setBookmarks(bookmarks: FMG.Extension.BookmarkData[]) {
        await channel.offscreen.setBookmarks({ bookmarks });
        _setBookmarks(bookmarks);
    }

    function findBookmarkIndex(url: string) {
        return bookmarks.findIndex((bookmark) => bookmark.url === url);
    }

    async function onAdd() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

            const activeTab = tabs.find((tab) => {
                if (!tab.url) return false;
                try {
                    const { hostname } = new URL(tab.url);
                    return hostname.endsWith("mapgenie.io");
                } catch {
                    return false;
                }
            });

            if (!activeTab || !activeTab.url) {
                toastr.warning("Open a MapGenie map in the active tab to bookmark it");
                return;
            }

            const url = activeTab.url;

            const bookmark: FMG.Extension.BookmarkData = {
                url,
                favicon: activeTab.favIconUrl ?? chrome.runtime.getURL("icons/fmg-icon-32.png"),
                title: activeTab.title ?? activeTab.url,
            };

            if (findBookmarkIndex(bookmark.url) >= 0) {
                toastr.error(`Bookmark already exists ${bookmark.url}`);
                return;
            }

            setBookmarks([...bookmarks, bookmark]);
        } catch (err) {
            toastr.error(String(err));
        }
    }

    async function onRemove(url: string) {
        const index = findBookmarkIndex(url);

        if (index === -1) return;

        const newBookmarks = [...bookmarks];
        newBookmarks.splice(index, 1);

        setBookmarks(newBookmarks);
    }

    async function onOpen(url: string, newTab: boolean) {
        if (newTab) {
            chrome.tabs.create({ url });
        } else {
            chrome.tabs.update({ url });
        }
    }

    return (
        <Bookmarks
            bookmarks={bookmarks}
            onAdd={onAdd}
            onRemove={onRemove}
            onOpen={onOpen}
        />
    );
}