const fs = require("node:fs");
const path = require("node:path");

const root = process.env.GITHUB_WORKSPACE || process.cwd();

function patch(relativePath, replacements) {
  const filePath = path.join(root, relativePath);
  let source = fs.readFileSync(filePath, "utf8");
  for (const [before, after] of replacements) {
    if (!source.includes(before)) {
      throw new Error(`Missing pattern in ${relativePath}: ${before}`);
    }
    source = source.replace(before, after);
  }
  fs.writeFileSync(filePath, source);
}

patch("src/frontend/src/pages/PlayerPage.tsx", [
  [
    '  const boxClass = size === "md" ? "size-10 rounded-xl" : "size-5 rounded-md";\n  const imgClass = size === "md" ? "size-8" : "size-4";',
    '  const boxClass = size === "md" ? "size-10" : "size-5";\n  const imgClass = size === "md" ? "size-10" : "size-5";',
  ],
  [
    '        "inline-flex items-center justify-center bg-white border border-primary/25 shrink-0",',
    '        "inline-flex items-center justify-center shrink-0",',
  ],
]);

patch("src/frontend/src/pages/TeamsPage.tsx", [
  [
    '<span className="size-6 rounded-md bg-white border border-primary/25 flex items-center justify-center shrink-0">\n                <img src={firstLogo} alt="" className="size-5 object-contain" />\n              </span>',
    '<span className="size-6 flex items-center justify-center shrink-0">\n                <img src={firstLogo} alt="" className="size-6 object-contain" />\n              </span>',
  ],
]);

patch("src/frontend/src/pages/TeamPage.tsx", [
  [
    'className="size-14 rounded-xl object-contain border border-border flex-shrink-0 bg-muted"',
    'className="size-14 object-contain flex-shrink-0"',
  ],
]);

patch("src/frontend/src/components/TeamCard.tsx", [
  [
    'className="size-10 rounded-lg object-contain flex-shrink-0"',
    'className="size-10 object-contain flex-shrink-0"',
  ],
]);
