export * from "./inject";

export type ClassName = string | undefined | null;

export interface ClassNameObject {
    [className: string]: boolean | undefined | null;
}

export function className(...classes: (ClassNameObject | ClassName)[]) {
    const finalClasses = [];

    for (const cls of classes) {
        if (cls === undefined || cls === null) continue;

        switch (typeof cls) {
            case "string":
                finalClasses.push(cls);
                break;
            case "object":
                Object.entries(cls)
                    .filter(([_, value]) => Boolean(value))
                    .map(([name, _]) => name)
                    .forEach((name) => finalClasses.push(name));
                break;
            default:
                throw new Error("invalid class type " + typeof cls);
        }
    }

    return finalClasses.join(" ");
}