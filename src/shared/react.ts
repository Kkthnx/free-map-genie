import { createElement, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import * as dom from "@shared/dom";

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

export interface ReactivePropOnchangeCallback<T> {
    (newValue: T): void;
}

export interface DisconnectCallback {
    (): void;
}

export class ReactiveProp<T> {

    private _value: T;
    private _onchange: Set<ReactivePropOnchangeCallback<T>>

    constructor(value: T) {
        this._value = value;
        this._onchange = new Set();
    }

    public onchange(cb: ReactivePropOnchangeCallback<T>): DisconnectCallback {
        this._onchange.add(cb);
        return () => (this._onchange.delete(cb), void 0);
    }

    private fireChange() {
        for (const cb of this._onchange) {
            cb(this._value);
        }
    }

    public get value() {
        return this._value;
    }

    public set value(newValue: T) {
        this._value = newValue;
        this.fireChange()
    }
}

export function useReactiveProp<T>(prop: ReactiveProp<T>) {
    const [value, setValue] = useState(prop.value);

    const setState = (newValue: T) => prop.value = newValue;

    useEffect(() => prop.onchange(setValue), []);

    return [value, setState] as const;
}

export type RawProps<P extends object> = {
    [K in keyof P]: P[K] extends ReactiveProp<infer T> ? T : P[K];
}

type UpdatablePropsKeys<P extends object> = {
    [K in keyof P]: P[K] extends ReactiveProp<infer T> ? K : never;
}[keyof P];

type UpdatableProps<P extends object> = RawProps<Pick<P, UpdatablePropsKeys<P>>>;

export type Component<P> = React.FunctionComponent<P> | React.ComponentClass<P>;

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

export class InjectedComponent<P extends object> {

    private readonly component: Component<P>;
    private readonly shadowRoot: HTMLDivElement;

    protected readonly props: P;
    
    private root?: ReactDOM.Root;
    private element?: React.ReactNode;


    public constructor(
        injectOptions: InjectOptions,
        component: Component<P>,
        props: P
    ) {
        this.component = component;

        this.shadowRoot = document.createElement("div");

        mountShadowRoot(injectOptions, this.shadowRoot)
            .catch((err) => logger.error("Failed to inject shadowroot for react component", err));

        this.props = props;
    }

    public updateProps(props: Partial<UpdatableProps<P>>) {
        Object.entries(props).forEach(([name, value]) => {
            const prop = this.props[name as keyof P] as ReactiveProp<any>;
            prop.value = value;
        });
    }

    public mount() {
        if (this.root) return;

        this.root = ReactDOM.createRoot(this.shadowRoot);
        this.element = createElement(this.component, this.props);
        this.root.render(this.element);
    }

    public unmount() {
        if (!this.root) return;

        this.root.unmount();
    }
}

export interface ClassNameObject {
    [className: string]: boolean | undefined | null;
}

export function cls(obj: ClassNameObject | (string | undefined)[]) {
    if (Array.isArray(obj)) {
        return obj.filter(Boolean).join(" ");
    } else {
        return Object.entries(obj)
            .filter(([_, value]) => Boolean(value))
            .map(([name, _]) => name)
            .join(" ");
    }
}