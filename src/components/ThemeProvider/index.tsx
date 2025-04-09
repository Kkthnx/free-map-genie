import React from "react";

import "@css/themes/dark.css";
import "@css/themes/light.css";

import "./theme-provider.css";

interface ThemeProviderProps extends React.PropsWithChildren {
    theme?: string;
}

function isThemePreferenceDark() {
    return window.matchMedia(
        "(prefers-color-scheme: dark)"
    ).matches;
}

export default function ThemeProvider(props: ThemeProviderProps) {
    const theme = (!props.theme || props.theme === "auto")
        ? "dark"
        : props.theme;

    return (
        <div className="theme-provider" data-theme={theme}>
            {props.children}
        </div>
    );
}