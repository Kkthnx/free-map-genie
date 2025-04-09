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
        if (!connected) {
            toastr.error("No connection to extension reload page");
            return;
        }

        try {
            const bookmark = await channel.extension.addBookmark();

            if (!bookmark || !bookmark.url || !bookmark.favicon || !bookmark.title) {
                logger.warn("Invalid bookmark", bookmark);
                toastr.warning("Invalid bookmark");
                return;
            }

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