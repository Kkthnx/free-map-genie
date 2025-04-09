import concurrently from "concurrently";

const { result } = concurrently([
    { command: "yarn build-chrome", name: "build::chrome",  },
    { command: "yarn build-firefox", name: "build::firefox" },
])

result.then(() => execSync("yarn sign", { stdio: "inherit" }));
