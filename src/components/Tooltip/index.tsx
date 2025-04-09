import { useState } from "react";
import { className } from "@shared/react";

import Icon from "@components/Icon";

import "./tooltip.scss";

export interface TooltipProps extends React.PropsWithChildren {
    tooltip: string;
    top?: boolean;
}

export default function Tooltip({ tooltip, top, children }: TooltipProps) {

    const [hover, setHover] = useState(false);

    return (
        <div
            className={className("fmg-tooltip", { top, hover })}
            data-tooltip={tooltip}
        >
            <div className="tooltip-container">
                {children}
            </div>
            <Icon
                icon="info-circled"
                size="14px"
                onMouseOver={() => setHover(true)}
                onMouseOut={() => setHover(false)}
            ></Icon>
        </div>
    );
}