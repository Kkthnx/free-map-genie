import React from "react";
import { className } from "@shared/react";

import Icon from "@components/Icon";

import "./icon-button.scss";

export interface ButtonProps {
    icon: string;
    className?: string;
    size?: string;
    toggle?: boolean;
    toggled?: boolean;

    onToggle?: (toggled: boolean) => void;
    onClick?: React.MouseEventHandler;
}

export default function IconButton(props: ButtonProps) {

    const toggle = props.toggle;

    const [toggled, setToggled] = React.useState(props.toggle && (props.toggled ?? false));

    function onClick(e: React.MouseEvent) {
        if (props.toggle) {
            setToggled(!toggled);
            props.onToggle?.(!toggled);
        } else {
            props.onClick?.(e);
        }
    }

    return (
        <button
            className={className(
                "icon-button",
                props.className,
                { toggled, toggle },
            )}
            onClick={onClick}
        >
            <Icon icon={props.icon} size={props.size} />
        </button>
    )
}