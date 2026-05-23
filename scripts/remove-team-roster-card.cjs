const fs = require("node:fs");
const path = require("node:path");

const root = process.env.GITHUB_WORKSPACE || process.cwd();
const filePath = path.join(root, "src", "frontend", "src", "pages", "PlayerPage.tsx");
let source = fs.readFileSync(filePath, "utf8");

const block = `
        {team?.name && (
          <Link
            to="/team/$id"
            params={{ id: player.teamId.toString() }}
            className="mx-4 flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-4 hover:border-primary/40 hover:bg-card/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TeamLogo teamName={team.name} size="md" />
              <div>
                <p className="text-xs text-muted-foreground">Se hele lagstallen</p>
                <p className="font-display font-black text-foreground text-sm">
                  {team.name}
                </p>
              </div>
            </div>
            <ArrowRight className="size-5 text-muted-foreground" />
          </Link>
        )}
`;

if (!source.includes(block)) {
  throw new Error("Could not find team roster card block");
}

source = source.replace(block, "");
fs.writeFileSync(filePath, source);
