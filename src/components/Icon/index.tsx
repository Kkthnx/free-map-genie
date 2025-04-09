import "@css/fmg-font.css";
import "./icon.css";

import { className } from "@shared/react";

export interface IconProps {
    className?: string;
    icon: string;
    size?: string;

    onClick?: React.MouseEventHandler;
    onMouseOver?: React.MouseEventHandler;
    onMouseOut?: React.MouseEventHandler;
}

export default function Icon(props: IconProps) {
    return (
        <i 
            className={className(
                "fmg-icon-" + props.icon,
                props.className
            )}
            
            style={{ fontSize: props.size }}

            onClick={props.onClick}
            onMouseOver={props.onMouseOver}
            onMouseOut={props.onMouseOut}
        />
    );
}