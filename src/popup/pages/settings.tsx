import Settings from "@components/Settings";

import channel from "@shared/channel/popup";
import React from "react";

import { Options, getDefaultSettings } from "@fmg/options";

export default function SettingsPage() {

    const [settings, _setSettings] = React.useState<FMG.Extension.Settings>(getDefaultSettings());

    React.useEffect(() => {
        async function fetchSettings() {
            const settings = await channel.offscreen.getSettings();
            logger.debug("fetched", settings);
            _setSettings(settings);
        }
        fetchSettings();
    }, []);

    async function setSettings(settings: FMG.Extension.Settings) {
        await channel.offscreen.setSettings({ settings });
        _setSettings(settings);
    }

    return (
        <Settings 
            options={Options}
            settings={settings}
            onChange={setSettings}
        />
    );
}