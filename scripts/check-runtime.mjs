import { readFileSync } from "node:fs";

const { engines } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const required = /^>=(\d+\.\d+\.\d+) <\d+$/.exec(engines.node)?.[1];
if (!required) throw new Error("Expected a bounded Node LTS range in package.json engines.node.");
const minimum = required.split(".").map(Number);
const current = process.versions.node.split(".").map(Number);
const isSupported =
  current[0] === minimum[0] && (current[1] > minimum[1] || (current[1] === minimum[1] && current[2] >= minimum[2]));

if (!isSupported) {
  console.error(
    `Valentine Heart requires Node.js ${required} or newer in the ${minimum[0]}.x LTS line; this command is using ${process.versions.node}.`,
  );
  console.error(
    `Run nvm install && nvm use, or select your installed Node ${minimum[0]} runtime as described in README.md.`,
  );
  process.exitCode = 1;
}
