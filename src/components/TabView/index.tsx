import { className } from "@shared/react";

import Icon from "@components/Icon";
import React from "react";

import "./tab-view.scss";

type TabViewPageElement = React.ReactElement<TabViewPageProps, typeof TabViewPage>;

export interface TabViewProps {
    page?: string;
    children?: TabViewPageElement | TabViewPageElement[]
}

export default function TabView(props: TabViewProps) {

    const children = props.children
        ? Array.isArray(props.children)
            ? props.children
            : [props.children]
        : undefined;

    const pages = children?.map((page) => ({
        name: page.props.name,
        icon: page.props.icon
    })) ?? [];

    const [currentPageName, setCurrentPageName] = React.useState(props.page ?? pages[0].name);

    const page = children?.find((child) => child.props.name == currentPageName);

    return (
        <div className="tab-view">
            <div className="tab-view-tabs">
                {
                    pages.map(({ name, icon }) => (
                        <TabViewTab
                            key={name}
                            name={name}
                            icon={icon}
                            selected={currentPageName === name}
                            onClick={setCurrentPageName}
                        />
                    ))
                }
            </div>
            <div className="tab-view-page-container">
                {
                    children?.map((child) => (
                        <div
                            key={child.props.name}
                            className={className(
                                "tab-view-page-wrapper",
                                { "show": currentPageName === child.props.name }
                            )}
                        >
                            {child}
                        </div>
                    ))
                }
            </div>
        </div>
    );
}


interface TabViewPageProps extends React.PropsWithChildren {
    name: string;
    icon?: string;
}

function TabViewPage(props: TabViewPageProps): React.ReactElement<TabViewPageProps, typeof TabViewPage> {
    return (
        <div className="tab-view-page" data-name={props.name}>
            {props.children}
        </div>
    );
}

TabView.Page = TabViewPage;


interface TabViewTabProps {
    name: string;
    icon?: string;
    selected?: boolean;

    onClick?: (name: string) => void;
}

function TabViewTab(props: TabViewTabProps) {
    return (
        <h1
            className={className(
                "tab-view-tab",
                { active: props.selected }
            )}
            title={props.name}
            onClick={() => props.onClick?.(props.name)}
        >
            {
                props.icon
                    ? <Icon icon={props.icon} size="16px" />
                    : <span>{props.name}</span>
            }
        </h1>
    );
}