import { useState } from "react";
import { className } from "@shared/react";

import IconButton from "@components/IconButton";

import "./bookmarks.scss";

interface BookmarkBaseProps extends React.PropsWithChildren {
    outline?: boolean;
}

function BookmarkBase({ outline, children }: BookmarkBaseProps) {
    return (
        <div 
            className={className(
                "bookmark",
                { outline }
            )}
        >
            {children}
        </div>
    );
}


interface BookmarkProps {
    data: FMG.Extension.BookmarkData;
    trash?: boolean;

    onTrash?: () => void;
    onOpen?: (newTab: boolean) => void;
}

function Bookmark(props: BookmarkProps) {
    const { data } = props;

    function onClick(e: React.MouseEvent) {
        if (props.trash) {
            if (e.button === 0) {
                props.onTrash?.();
            }
        } else {
            const newTab = (e.button === 0 && e.ctrlKey) || e.button === 1;
            props.onOpen?.(newTab);
        }
    }

    return (
        <BookmarkBase outline={true}>
            <img
                src={data.favicon}
                alt={data.title}
                title={data?.title}
                draggable={false}
                onClick={onClick}
                onAuxClick={onClick}
            />
            <div className={className(
                "trash-button",
                { show: props.trash }
            )}>
                <IconButton icon="trash" className="trash-bookmark" />
            </div>
        </BookmarkBase>
    )
}


interface BookmarkAddProps {
    onClick?: React.MouseEventHandler;
    trash?: boolean;
}

function BookmarkAdd(props: BookmarkAddProps) {

    function onClick(e: React.MouseEvent) {
        if (!props.trash) {
            props.onClick?.(e);
        }
    }

    return (
        <BookmarkBase outline={true}>
            <div className="bookmark-add" onClick={onClick}>
                <h1>+</h1>
            </div>
        </BookmarkBase>
    )
}


export interface BookmarksProps {
    bookmarks: FMG.Extension.BookmarkData[];
    onRemove?: (url: string) => void;
    onOpen?: (url: string, newTab: boolean) => void;
    onAdd?: () => void;
}

export default function Bookmarks(props: BookmarksProps) {

    const [trash, setTrash] = useState(false);

    return (
        <div className="bookmarks-container">
            <div className="bookmark-actions">
                <IconButton
                    icon="trash"
                    size="20px"
                    toggle={true}
                    onToggle={setTrash}
                />
            </div>
            <div className="bookmarks">
                {
                    props.bookmarks.map((data, i) => (
                        <Bookmark
                            key={i}
                            data={data}
                            trash={trash}
                            onTrash={() => props.onRemove?.(data.url)}
                            onOpen={(newTab) => props.onOpen?.(data.url, newTab)}
                        />
                    ))
                }
                <BookmarkAdd 
                    trash={trash}
                    onClick={props.onAdd}
                />
            </div>
        </div>
    )
}