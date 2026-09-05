const fs = require("node:fs");
const path = require("node:path");
const { Ed25519KeyIdentity } = require("@dfinity/identity");

const outputPath = path.resolve(
  process.argv[2] || "./secrets/ai-worker-identity.json",
);

if (fs.existsSync(outputPath)) {
  throw new Error(`Refusing to overwrite existing identity: ${outputPath}`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const identity = Ed25519KeyIdentity.generate();
fs.writeFileSync(outputPath, JSON.stringify(identity.toJSON()), {
  encoding: "utf8",
  mode: 0o600,
});

console.log(`Worker identity created: ${outputPath}`);
console.log(`Worker principal: ${identity.getPrincipal().toText()}`);
console.log("Keep this file private and back it up securely.");
