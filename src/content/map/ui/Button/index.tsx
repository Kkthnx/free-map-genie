export interface ButtonProps extends React.PropsWithChildren {
    onClick?: React.MouseEventHandler;
}

export default function Button(props: ButtonProps) {
    return (
        <button className="btn btn-outline-secondary" type="button" onClick={props.onClick}>
            {props.children}
        </button>
    );
}