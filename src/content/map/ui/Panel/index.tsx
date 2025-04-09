import { InjectedComponent } from "@shared/react";
import { Fragment } from "react";

interface PanelProps extends React.PropsWithChildren {
    name: string;
}


class InjectedPanel extends InjectedComponent<PanelProps> {
    public constructor(name: string) {
        super({
            element: "#settings-section",
            place: "after"
        }, { name, children: [] });

        this.shadowRoot.classList.add("panel-section", `${name.toLowerCase()}-panel`);
    }

    public setChildren(children: React.ReactNode) {
        this.props.children = children;
    }

    public render() {
        return (
            <>
            <h5 className="panel-section-header">{ this.props.name }</h5>
                {this.props.children}
            </>
        );
    }
}


export default abstract class Panel<P extends object> {
    private readonly panel: InjectedPanel;

    public readonly props: P;

    public constructor(name: string, props: P) {
        this.panel = new InjectedPanel(name);
        this.props = props;
    }

    public updateProps(props: Partial<P>) {
        Object.assign(this.props, props);

        if (this.panel.isMounted) {
            this.panel.updateProps({ children: this.render() });
        }
    }

    public mount() {
        this.panel.updateProps({ children: this.render() })
        this.panel.mount();
    }

    public unmount() {
        this.panel.unmount();
    }

    protected render() {
        return (<h1>override panel::render!</h1>);
    }
}