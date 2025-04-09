import ReactDOM from "react-dom/client";

import channel from "@shared/channel/popup";

import App from "./App";

channel.connect();

const element = document.querySelector("#app")!;
const root = ReactDOM.createRoot(element);
root.render(<App />);