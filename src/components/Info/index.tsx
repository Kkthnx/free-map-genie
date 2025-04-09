import type { State } from "@/content";
import type { PageType } from "@fmg/page";

import "./info.scss";

interface InfoItemProps extends React.PropsWithChildren {
    name: string
}

function InfoItem({ name, children }: InfoItemProps) {
    return (
        <div className="info-item">
            <h4>{name}</h4>
            <span>{children}</span>
        </div>
    );
}


interface UserInfoProps {
    user: Id;
}

function UserInfo({ user }: UserInfoProps) {
    return (
        <InfoItem name={"User"}>
            {user}
        </InfoItem>
    );
}


interface PageTypeInfoProps {
    type: PageType;
}

function PageTypeInfo({ type }: PageTypeInfoProps) {
    return (
        <InfoItem name={"Page Type"}>
            {type}
        </InfoItem>
    );
}


export interface InfoProps extends State {}

export default function Info({ type, user }: InfoProps) {
    return (
        <div className="info">
            <PageTypeInfo type={type} />
            <UserInfo user={user} />
        </div>
    );
}