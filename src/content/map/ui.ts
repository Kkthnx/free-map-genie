import type { FMG_MapManager } from "@fmg/map-manager";

import { TotalProgress, CategoryProgress } from "@components/Map/Progress";
import { MarkControls } from "@components/Map/MarkControls";

export default class FMG_UI {
    private mapManager: FMG_MapManager;

    private totalProgress: TotalProgress;
    private categoryProgress: CategoryProgress;
    private markControls: MarkControls;

    constructor(mapManager: FMG_MapManager) {
        this.mapManager = mapManager;

        this.totalProgress = new TotalProgress(mapManager);
        this.categoryProgress = new CategoryProgress(mapManager);
        this.markControls = new MarkControls(mapManager);
    }

    public async attach() {
        if (this.mapManager.window.user) {
            this.totalProgress.mount();
            this.categoryProgress.mount();
        }
        this.markControls.mount();

        this.update();
    }

    public update() {
        this.totalProgress.update();
        this.categoryProgress.update();
    }
}
