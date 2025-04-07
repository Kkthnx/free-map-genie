import { useReactiveProp, InjectedComponent, ReactiveProp } from "@shared/react";
import type { InjectOptions, RawProps } from "@shared/react";
import type { FMG_MapManager } from "@fmg/map-manager";

export interface ProgressProps {
    total: ReactiveProp<number>;
    value: ReactiveProp<number>;
    hr?: boolean;
}

function ProgressImpl(props: ProgressProps) {
    const [value] = useReactiveProp(props.value);
    const [total] = useReactiveProp(props.total);

    const percent = total === 0 && value === 0
        ? 100
        : (value / total) * 100;

    return (
        <>
            <div className="progress-item-wrapper" style={{ marginRight: "10px" }}>
                <div className="progress-item">
                    <span className="title">{ percent.toFixed(2) + "%" }</span>
                    <span className="counter">{ value } / { total }</span>
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar"
                            role="progressbar"
                            style={{ width: percent + "%" }}
                        ></div>
                    </div>
                </div>
            </div>
            {props.hr ? <hr/> : undefined}
        </>
    );
}

class Progress extends InjectedComponent<ProgressProps> {

    public constructor(injectOptions: InjectOptions, props: RawProps<ProgressProps>) {
        super(injectOptions, ProgressImpl, {
            total: new ReactiveProp(props.total),
            value: new ReactiveProp(props.value),
            hr: props.hr
        });
    }

    public setProgress(value: number, total: number) {
        super.updateProps({ value, total });
    }

    public setTotal(total: number) {
        super.updateProps({ total });
    }

    public reset() {
        super.updateProps({ value: 0 });
    }

    public increment(amount = 1) {
        this.props.value.value += amount;
    }
}

export class TotalProgress extends Progress {

    private mapManager: FMG_MapManager;

    public constructor(mapManager: FMG_MapManager) {
        super({
            element: ".category-progress",
            place: "before",
        }, {
            total: 0,
            value: 0,
            hr: true
        });

        this.mapManager = mapManager;
    }

    public update() {
        const { map } = this.mapManager.store.getState();
        const { locationIds } = this.mapManager.storage.data;

        const total = map.locations.length;
        const value = locationIds.length;

        this.updateProps({ total, value });
    }
}

export class CategoryProgress extends Progress {

    private mapManager: FMG_MapManager;

    public constructor(mapManager: FMG_MapManager) {
        super({
            element: ".category-progress",
            place: "before",
        }, {
            total: 0,
            value: 0,
        });

        this.mapManager = mapManager;
    }

    public update() {
        let [total, value] = [0, 0];
        const locByCat =
            this.mapManager.store.getState().map.locationsByCategory;
            
        const { categoryIds, locations } = this.mapManager.storage.data;
        categoryIds.forEach((catId) => {
            total += locByCat[catId]?.length ?? 0;
            locByCat[catId]?.forEach((loc) => {
                if (locations[loc.id]) value++;
            });
        });

        this.updateProps({ total, value });
    }
}
