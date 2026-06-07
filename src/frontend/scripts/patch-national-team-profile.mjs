import fs from "node:fs";
import path from "node:path";

const playerPagePath = path.resolve("src/pages/PlayerPage.tsx");
let source = fs.readFileSync(playerPagePath, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) {
    throw new Error(`Could not patch PlayerPage.tsx: missing ${label}`);
  }
  source = source.replace(search, replacement);
  changed = true;
}

if (!source.includes("../data/nationalTeamPlayers")) {
  replaceOnce(
    'import { PositionBadge } from "../components/PositionBadge";\n',
    'import { PositionBadge } from "../components/PositionBadge";\nimport { getNationalTeamInfo } from "../data/nationalTeamPlayers";\n',
    "national team import",
  );
}

if (!source.includes("const nationalTeam = getNationalTeamInfo(player.id);")) {
  replaceOnce(
    '  const initials = player.name\n    .split(" ")\n    .map((part) => part[0])\n    .join("")\n    .slice(0, 2)\n    .toUpperCase();\n\n  function handleFollowClick() {',
    '  const initials = player.name\n    .split(" ")\n    .map((part) => part[0])\n    .join("")\n    .slice(0, 2)\n    .toUpperCase();\n  const nationalTeam = getNationalTeamInfo(player.id);\n\n  function handleFollowClick() {',
    "national team lookup",
  );
}

const oldTeamBlock = `          {teamName && (
            <Link
              to="/team/$id"
              params={{ id: teamId.toString() }}
              className="inline-flex items-center gap-2 mt-3 text-sm font-display font-bold text-primary hover:text-primary/80 transition-colors"
            >
              <TeamLogo teamName={teamName} />
              {teamName}
              <ArrowRight className="size-4" />
            </Link>
          )}`;

const newTeamBlock = `          {teamName && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to="/team/$id"
                  params={{ id: teamId.toString() }}
                  className="inline-flex items-center gap-2 text-sm font-display font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  <TeamLogo teamName={teamName} />
                  {teamName}
                  <ArrowRight className="size-4" />
                </Link>

                {nationalTeam?.logoUrl && (
                  <a
                    href={nationalTeam.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-white/95 p-0.5 shadow-subtle"
                    title={nationalTeam.teamLabel}
                  >
                    <img
                      src={nationalTeam.logoUrl}
                      alt={nationalTeam.teamLabel}
                      className="max-h-full max-w-full object-contain"
                    />
                  </a>
                )}
              </div>

              {nationalTeam && (
                <p className="text-[11px] font-display font-bold uppercase tracking-widest text-muted-foreground">
                  Landslagsspiller
                </p>
              )}
            </div>
          )}`;

replaceOnce(oldTeamBlock, newTeamBlock, "team/national team block");

if (changed) {
  fs.writeFileSync(playerPagePath, source);
  console.log("Patched PlayerPage.tsx with national team profile badge.");
} else {
  console.log("PlayerPage.tsx already has national team profile badge.");
}
