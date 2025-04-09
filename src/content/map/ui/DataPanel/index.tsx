import type { FMG_MapManager } from "@fmg/map-manager";

import Panel from "../Panel";
import Button from "../Button";

import "./data-panel.scss";
import Icon from "@components/Icon";

interface DataPanelProps {
    value: string;
}


export default class DataPanel extends Panel<DataPanelProps> {
    private readonly mapManager: FMG_MapManager;

    public constructor(mapManager: FMG_MapManager) {
        super("data", { value: "Hello World" });
        this.mapManager = mapManager;
    }

    public override render() {

        const { mapManager } = this;

        async function importData() {
            await mapManager.import();
        }

        async function exportData() {
            await mapManager.export();
        }

        async function clearData() {
            await mapManager.clear();
        }

        async function importMapgenieAccount() {
            await mapManager.importMapgenieAccount();
        }

        return (
            <>
                <div className="btn-group">
                    <Button onClick={importData}>
                        <Icon icon="upload" />
                        Import
                    </Button>
                    <Button onClick={exportData}>
                        <Icon icon="download" />
                        Export
                    </Button>
                    <Button onClick={clearData}>
                        <Icon icon="trash" />
                        Clear
                    </Button>
                </div>
                <div className="btn-group">
                    <Button onClick={importMapgenieAccount}>
                        <Icon icon="cloud" />
                        Import From Mapgenie Account
                    </Button>
                </div>
            </>
        );
    }
}