import concurrently from "concurrently";
import { execSync } from "child_process";

const { result } = concurrently([
    { command: "yarn build-chrome", name: "build::chrome" },
    { command: "yarn build-firefox", name: "build::firefox" },
]);

result
    .then(() => {
        try {
            execSync("yarn sign", { stdio: "inherit" });
        } catch (err) {
            // Don't fail the whole build if signing fails in local/dev
            console.error("Signing step failed:", err);
        }
    })
    .catch((err) => {
        console.error("Build processes failed:", err);
        process.exitCode = 1;
    });
