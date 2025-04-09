import Icon from "@components/Icon";

export interface ControlGroupProps extends React.PropsWithChildren {
    // horizontal?: boolean;
}

export interface ControlProps {
    name: string;
    icon: string;
    disabled?: boolean;
    onClick?: () => void;
}

export function Control({ name, icon, disabled, onClick }: ControlProps) {
    return (
        <button
            className="mapboxgl-ctrl-compass"
            type="button"
            title={name}
            aria-label={name}
            aria-disabled={disabled}
            onClick={onClick}
        >
            <Icon icon={icon} size="24px" className="fmg-control-icon" />
        </button>
    );
}

export function ControlGroup({ children }: ControlGroupProps) {
    return (
        <div className="mapboxgl-ctrl mapboxgl-ctrl-group">
            {children}
        </div>
    );
}