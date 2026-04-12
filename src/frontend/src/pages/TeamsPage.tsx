import { Shield, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { SkeletonCard } from "../components/SkeletonCard";
import { TeamCard } from "../components/TeamCard";
import { useTeams, useUpcomingMatches } from "../hooks/useTeams";
import type { Match } from "../types/handball";

export default function TeamsPage() {
  const { data: teams, isLoading } = useTeams();
  const { data: upcomingMatches } = useUpcomingMatches();

  // Map teamId -> next upcoming match
  const teamNextMatch = new Map<string, Match>();
  for (const m of upcomingMatches ?? []) {
    const hKey = m.homeTeamId.toString();
    const aKey = m.awayTeamId.toString();
    if (!teamNextMatch.has(hKey)) teamNextMatch.set(hKey, m);
    if (!teamNextMatch.has(aKey)) teamNextMatch.set(aKey, m);
  }

  // Build team name map for opponent display
  const teamNames = new Map<string, string>(
    (teams ?? []).map((t) => [t.id.toString(), t.name]),
  );

  const sorted = [...(teams ?? [])].sort((a, b) => {
    const rankA = a.standingsRank !== undefined ? Number(a.standingsRank) : 999;
    const rankB = b.standingsRank !== undefined ? Number(b.standingsRank) : 999;
    return rankA - rankB;
  });

  return (
    <div className="space-y-5" data-ocid="teams-page">
      {/* Page header */}
      <div className="pt-1 space-y-1">
        <h1 className="font-display font-black text-2xl tracking-tight text-foreground">
          REMA 1000-ligaen
        </h1>
        <p className="text-sm text-muted-foreground font-body">
          Damenes handball — 2024/25
        </p>
      </div>

      {/* Summary bar */}
      {!isLoading && sorted.length > 0 && (
        <div className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <span className="text-sm font-display font-bold text-foreground">
              {sorted.length} lag
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Trophy className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Trykk på et lag for å se spillerstallen
            </span>
          </div>
        </div>
      )}

      {/* Teams list */}
      {isLoading ? (
        <div className="space-y-3">
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <SkeletonCard key={k} variant="team" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-center space-y-3"
          data-ocid="teams-empty"
        >
          <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
            <Shield className="size-8 text-muted-foreground" />
          </div>
          <p className="font-display font-bold text-lg text-foreground">
            Ingen lag funnet
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Lagene lastes snart. Prøv å oppdatere siden.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((team, i) => {
            const nextMatch = teamNextMatch.get(team.id.toString());
            const opponentId = nextMatch
              ? nextMatch.homeTeamId === team.id
                ? nextMatch.awayTeamId.toString()
                : nextMatch.homeTeamId.toString()
              : undefined;
            return (
              <motion.div
                key={team.id.toString()}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <TeamCard
                  team={team}
                  nextMatch={nextMatch}
                  opponentName={
                    opponentId ? teamNames.get(opponentId) : undefined
                  }
                />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
