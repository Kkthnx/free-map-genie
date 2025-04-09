import ReactDOM from "react-dom/client";
import * as dom from "@shared/dom";

export type Component<P> = React.FunctionComponent<P> | React.ComponentClass<P>;

export type InjectElement = string | HTMLElement;

export interface InjectObject {
    element: InjectElement;
    place: "before" | "after";
}

export type InjectOptions = InjectElement | InjectObject;

async function getElement(element: InjectElement) {
    switch (typeof element) {
        case "string":
            return dom.getElement(element, window, 30000);
        case "object":
            return element;
        default:
            throw new Error("Invalid element");
    }
}

async function mountShadowRoot(injectOptions: InjectOptions, shadowRoot: HTMLDivElement) {
    if (typeof injectOptions === "object" && "place" in injectOptions) {
        switch (injectOptions.place) {
            case "after": {
                const element = await getElement(injectOptions?.element);
                element?.after(shadowRoot);
            }
            case "before": {
                const element = await getElement(injectOptions?.element);
                element?.before(shadowRoot);
            }
        }
    } else {
        const element = await getElement(injectOptions)
        element?.append(shadowRoot);
    }
}

export abstract class InjectedComponent<P extends object> {

    protected readonly shadowRoot: HTMLDivElement;
    protected readonly props: P;
    
    private root?: ReactDOM.Root;

    public constructor(
        injectOptions: InjectOptions,
        props: P
    ) {
        this.shadowRoot = document.createElement("div");
        this.shadowRoot.className = "shadowroot";

        mountShadowRoot(injectOptions, this.shadowRoot)
            .catch((err) => logger.error("Failed to inject shadowroot for react component", err));

        this.props = props;
    }

    public updateProps(props: Partial<P>) {
        Object.assign(this.props, props);

        if (this.root) {
            this.root.render(this.render());
        }
    }

    public get isMounted() {
        return !!this.root;
    }

    public mount() {
        if (this.root) return;

        this.root = ReactDOM.createRoot(this.shadowRoot);
        this.root.render(this.render());
    }

    public unmount() {
        if (!this.root) return;

        this.root.unmount();
        this.root = undefined;
    }

    protected render() {
        return (<h1>override InjectedComponent::render!</h1>);
    }
}