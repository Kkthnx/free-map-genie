import { useState } from "react";

import Tooltip from "@components/Tooltip";

import "./settings.scss";

interface BaseOptionProps extends React.PropsWithChildren {
    tooltip: string;
    top?: boolean;
}

function BaseOption(props: BaseOptionProps) {
    return (
        <div className="option">
            <Tooltip {...props}>
                {props.children}
            </Tooltip>
        </div>
    );
}


interface CheckboxOptionProps {
    name: string;
    label: string;
    tooltip: string;
    tooltipTop: boolean;
    value?: boolean;

    onChange?: (checked: boolean) => void;
}

function CheckboxOption(props: CheckboxOptionProps) {
    function onChange(e: React.ChangeEvent<HTMLInputElement>) {
        props.onChange?.(e.target.checked);
    }

    return (
        <BaseOption tooltip={props.tooltip} top={props.tooltipTop}>
            <div className="checkbox">
                <div className="toggle-button-cover">
                    <div className="button r">
                        <input
                            type="checkbox"
                            checked={props.value}
                            onChange={onChange}
                        />
                        <div className="knobs"></div>
                        <div className="layer"></div>
                    </div>
                </div>
                <span>{ props.label }</span>
            </div>
        </BaseOption>
    );
}


interface OptionProps {
    type: string;
    name: string;
    label: string;
    tooltip: string;
    tooltipTop: boolean;
    value?: any;

    onChange?: (value: any) => void;
}

function Option(props: OptionProps) {
    switch (props.type) {
        case "checkbox":
            return (<CheckboxOption {...props} />);
        default:
            throw new Error(`Unsupported option type ${props.type}`);
    }
}


export interface SettingsProps {
    options: FMG.Extension.Option[];
    settings: FMG.Extension.Settings;

    onChange?: (settings: FMG.Extension.Settings) => void;
}

export default function Settings(props: SettingsProps) {
    function getValue(name: string) {
        logger.debug("get", name, props.settings[name as keyof FMG.Extension.Settings])
        return props.settings[name as keyof FMG.Extension.Settings];
    }

    function onChange(name: string, value: any) {
        const settings = { ...props.settings };
        settings[name as keyof FMG.Extension.Settings] = value;
        props.onChange?.(settings);
    }

    return (
        <div className="settings">
            {
                props.options.map((option, i) => (
                    <Option
                        {...option}
                        key={i} 
                        tooltipTop={i != 0}
                        value={getValue(option.name) ?? option.value}
                        onChange={(value) => onChange(option.name, value)}
                    />
                ))
            }
        </div>
    )
}