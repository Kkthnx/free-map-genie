import "@css/fmg-font.css";
import "./icon.css";

import { cls } from "@shared/react";

export interface IconProps {
    className?: string;
    icon: string;
    size?: string;
}

export default function Icon({ icon, size, className }: IconProps) {
    logger.debug(cls([
        "fmg-icon-" + icon,
        className
    ]));
    return (
        <i className={cls([
            "fmg-icon-" + icon,
            className
        ])} style={{ fontSize: size }}></i>
    );
}