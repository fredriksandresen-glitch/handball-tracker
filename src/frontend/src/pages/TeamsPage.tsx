import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Minus,
  Search,
  Shield,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";
import { LeagueSelect, useSelectedLeague } from "../components/LeagueSelect";
import { SeasonSelect, useSelectedSeason } from "../components/SeasonSelect";
import { SkeletonCard } from "../components/SkeletonCard";
import {
  leagueStandingsBySeasonAndLeague,
  type LeagueStanding,
} from "../data/leagueStandings";
import {
  FIRST_DIVISION_LEAGUE_ID,
  getLeagueLabel,
  getSeason,
  type LeagueId,
  type SeasonId,
} from "../data/seasons";
import { useTeams } from "../hooks/useTeams";
import type { Team } from "../types/handball";
import { getTeamLogoClassName } from "../utils/teamLogoStyles";

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\u00e6/g, "ae")
    .replace(/\u00f8/g, "o")
    .replace(/\u00e5/g, "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(" handball klubb", "");
}

function Movement({ delta }: { delta: number }) {
  if (delta > 0) {
    return <span className="inline-flex items-center gap-0.5 text-chart-2 font-mono font-bold"><ArrowUp className="size-3.5" />{delta}</span>;
  }
  if (delta < 0) {
    return <span className="inline-flex items-center gap-0.5 text-destructive font-mono font-bold"><ArrowDown className="size-3.5" />{Math.abs(delta)}</span>;
  }
  return <span className="inline-flex items-center justify-center text-muted-foreground"><Minus className="size-3.5" /></span>;
}

function TeamLogo({ team }: { team?: Team }) {
  if (team?.logoUrl) {
    return <span className="size-8 flex items-center justify-center shrink-0"><img src={team.logoUrl} alt="" className={cn("size-8 object-contain", getTeamLogoClassName(team?.name))} /></span>;
  }
  return <span className="size-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0"><Shield className="size-4 text-muted-foreground" /></span>;
}

function StandingRow({
  standing, team, index, season, league,
}: {
  standing: LeagueStanding; team?: Team; index: number; season: SeasonId; league: LeagueId;
}) {
  const goalDifference = standing.goalsFor - standing.goalsAgainst;
  const content = (
    <div className="grid grid-cols-[34px_minmax(140px,1fr)_46px_84px_44px_34px] md:grid-cols-[44px_minmax(220px,1fr)_60px_96px_80px_54px_40px] items-center gap-2 px-3 py-3 text-sm">
      <div className="font-mono font-black text-foreground tabular-nums">{standing.rank}</div>
      <div className="flex items-center gap-2 min-w-0">
        <TeamLogo team={team} />
        <div className="min-w-0">
          <p className="font-display font-black text-foreground truncate">{standing.name}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{standing.played} kamper</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-display font-black text-lg text-primary leading-none tabular-nums">{standing.points}</p>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">P</p>
      </div>
      <div className="grid grid-cols-3 text-center font-mono font-bold tabular-nums text-foreground">
        <span>{standing.wins}</span><span>{standing.draws}</span><span>{standing.losses}</span>
      </div>
      <div className="hidden md:block text-right font-mono font-bold text-muted-foreground tabular-nums">{standing.goalsFor}-{standing.goalsAgainst}</div>
      <div className={cn("text-right font-mono font-bold tabular-nums", goalDifference > 0 && "text-chart-2", goalDifference < 0 && "text-destructive", goalDifference === 0 && "text-muted-foreground")}>
        {goalDifference > 0 ? `+${goalDifference}` : goalDifference}
      </div>
      <div className="flex justify-end"><Movement delta={standing.rankDelta} /></div>
    </div>
  );
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }} className="border-b border-border/55 last:border-0">
      {team ? (
        <Link to="/team/$id" params={{ id: team.id.toString() }} search={{ season, league }} className="block transition-colors hover:bg-muted/25" data-ocid="standings-team-row">{content}</Link>
      ) : <div className="opacity-80" data-ocid="standings-team-row-empty">{content}</div>}
    </motion.div>
  );
}

function TeamDirectoryRow({
  standing, team, index, season, league,
}: {
  standing: LeagueStanding; team?: Team; index: number; season: SeasonId; league: LeagueId;
}) {
  const content = (
    <div className="flex min-h-[68px] items-center gap-3 px-4 py-3">
      <TeamLogo team={team} />
      <div className="min-w-0 flex-1">
        <p className="font-display font-black text-foreground truncate">{standing.name}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Spillerstall</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </div>
  );
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }} className="border-b border-border/55 last:border-0">
      {team ? (
        <Link to="/team/$id" params={{ id: team.id.toString() }} search={{ season, league }} className="block transition-colors hover:bg-muted/25" data-ocid="division-team-row">{content}</Link>
      ) : <div className="opacity-80">{content}</div>}
    </motion.div>
  );
}

export default function TeamsPage() {
  const seasonId = useSelectedSeason();
  const leagueId = useSelectedLeague();
  const season = getSeason(seasonId);
  const leagueLabel = getLeagueLabel(leagueId, seasonId);
  const standings = leagueStandingsBySeasonAndLeague[seasonId][leagueId];
  const isTeamDirectory = leagueId === FIRST_DIVISION_LEAGUE_ID;
  const { data: teams, isLoading } = useTeams(seasonId, leagueId);
  const teamByName = new Map<string, Team>();
  for (const team of teams ?? []) teamByName.set(normalizeName(team.name), team);

  return (
    <div className="space-y-5" data-ocid="teams-page">
      <div className="pt-1 flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="font-display font-black text-2xl tracking-tight text-foreground">{leagueLabel}</h1>
          <p className="text-sm text-muted-foreground font-body">Damenes håndball · {season.label}</p>
        </div>
        <SeasonSelect compact />
      </div>
      <LeagueSelect />
      <div className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-primary" />
          <span className="text-sm font-display font-bold text-foreground">{isTeamDirectory ? "Lagoversikt" : "Tabell"}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-xs text-muted-foreground">Trykk på et lag for å se spillerstallen</span>
      </div>
      {isLoading ? (
        <div className="space-y-3">{["a", "b", "c", "d", "e", "f"].map((key) => <SkeletonCard key={key} variant="team" />)}</div>
      ) : standings.length === 0 ? (
        <div className="min-h-[38vh] flex flex-col items-center justify-center text-center px-6 rounded-xl bg-card border border-border">
          <Search className="size-9 text-muted-foreground mb-3" />
          <h2 className="font-display font-bold text-lg text-foreground">Ingen lag registrert</h2>
          <p className="text-sm text-muted-foreground mt-1">Velg en annen sesong eller liga.</p>
        </div>
      ) : isTeamDirectory ? (
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          {standings.map((standing, index) => (
            <TeamDirectoryRow key={standing.primeTeamId} standing={standing} team={teamByName.get(normalizeName(standing.name))} index={index} season={seasonId} league={leagueId} />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[34px_minmax(140px,1fr)_46px_84px_44px_34px] md:grid-cols-[44px_minmax(220px,1fr)_60px_96px_80px_54px_40px] items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
            <span>#</span><span>Lag</span><span className="text-right">Poeng</span>
            <span className="grid grid-cols-3 text-center"><span>S</span><span>U</span><span>T</span></span>
            <span className="hidden md:block text-right">Mål</span><span className="text-right">+/-</span><span className="text-right">Form</span>
          </div>
          {standings.map((standing, index) => (
            <StandingRow key={standing.primeTeamId} standing={standing} team={teamByName.get(normalizeName(standing.name))} index={index} season={seasonId} league={leagueId} />
          ))}
        </section>
      )}
    </div>
  );
}
