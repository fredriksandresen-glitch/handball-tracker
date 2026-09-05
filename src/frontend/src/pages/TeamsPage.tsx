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
  getLeagueLabel,
  getSeason,
  type LeagueId,
  type SeasonId,
} from "../data/seasons";
import { getStaticTeamLogoUrl } from "../services/clawdbotPlayerProfile";
import { useTeams } from "../hooks/useTeams";
import { getStaticTeamByPrimeId } from "../services/clawdbotPlayerProfile";
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

function TeamLogo({ team, teamName }: { team?: Team; teamName?: string }) {
  // Fallback til navneoppslag (2026-08-27): lag i tabellen som ikke matcher et
  // Team-objekt fikk skjold selv om logoen finnes. Na slaar vi opp paa navn.
  const name = team?.name ?? teamName;
  const logoUrl = team?.logoUrl ?? getStaticTeamLogoUrl(name);
  if (logoUrl) {
    return <span className="size-8 flex items-center justify-center shrink-0"><img src={logoUrl} alt="" className={cn("size-8 object-contain", getTeamLogoClassName(name))} /></span>;
  }
  return <span className="size-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0"><Shield className="size-4 text-muted-foreground" /></span>;
}

function StandingRow({
  standing, team, index, season, league, totalTeams = 0,
}: {
  standing: LeagueStanding; team?: Team; index: number; season: SeasonId; league: LeagueId; totalTeams?: number;
}) {
  const goalDifference = standing.goalsFor - standing.goalsAgainst;
  const decided = standing.wins + standing.draws + standing.losses;
  const pct = (value: number) => (decided > 0 ? (value / decided) * 100 : 0);
  // Fargestripe til venstre. NB: grensene er ANTATT (topp 4 sluttspill,
  // 5-6 kvalifisering, nederste 2 nedrykk) og ma verifiseres mot NHFs
  // reglement for sesongen for dette presenteres som fasit.
  const stripe =
    standing.rank <= 4
      ? "bg-chart-2"
      : standing.rank <= 6
        ? "bg-chart-4"
        : totalTeams > 0 && standing.rank > totalTeams - 2
          ? "bg-destructive"
          : "bg-transparent";

  const content = (
    <div className="relative grid grid-cols-[30px_minmax(0,1fr)_auto] md:grid-cols-[38px_minmax(0,1fr)_150px_92px_66px_auto] items-center gap-3 py-3 pl-3 pr-3.5 md:gap-4">
      <span className={cn("absolute left-0 inset-y-0 w-[3px]", stripe)} aria-hidden="true" />

      {/* Plassering med bevegelsespil under — sparer en egen kolonne. */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-display font-black text-[15px] leading-none tabular-nums text-foreground">
          {standing.rank}
        </span>
        <Movement delta={standing.rankDelta} />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <TeamLogo team={team} teamName={standing.name} />
          <span className="font-display font-black text-foreground truncate">{standing.name}</span>
        </div>
        {/* Stablet S/U/T-soyle: tre tall pa 28px hver var uleselig pa mobil. */}
        <div className="md:hidden mt-1.5 flex h-[5px] overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span className="bg-chart-2" style={{ width: `${pct(standing.wins)}%` }} />
          <span className="bg-chart-4" style={{ width: `${pct(standing.draws)}%` }} />
          <span className="bg-destructive" style={{ width: `${pct(standing.losses)}%` }} />
        </div>
        <div className="md:hidden mt-1 flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
          <span className="font-bold text-chart-2">{standing.wins}S</span>
          <span className="font-bold text-chart-4">{standing.draws}U</span>
          <span className="font-bold text-destructive">{standing.losses}T</span>
          <span className="size-[3px] rounded-full bg-border" />
          <span>{standing.played} kamper</span>
          <span className="size-[3px] rounded-full bg-border" />
          <span className={cn("font-bold", goalDifference > 0 && "text-chart-2", goalDifference < 0 && "text-destructive")}>
            {goalDifference > 0 ? `+${goalDifference}` : goalDifference}
          </span>
        </div>
      </div>

      {/* Fra md og opp far soyle, malscore og differanse egne kolonner. */}
      <div className="hidden md:block">
        <div className="flex h-[5px] overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span className="bg-chart-2" style={{ width: `${pct(standing.wins)}%` }} />
          <span className="bg-chart-4" style={{ width: `${pct(standing.draws)}%` }} />
          <span className="bg-destructive" style={{ width: `${pct(standing.losses)}%` }} />
        </div>
        <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] tabular-nums">
          <span className="font-bold text-chart-2">{standing.wins}S</span>
          <span className="font-bold text-chart-4">{standing.draws}U</span>
          <span className="font-bold text-destructive">{standing.losses}T</span>
          <span className="text-muted-foreground">· {standing.played} kamper</span>
        </div>
      </div>
      <div className="hidden md:block text-right font-mono text-xs text-muted-foreground tabular-nums">
        {standing.goalsFor}–{standing.goalsAgainst}
      </div>
      <div className={cn("hidden md:block text-right font-mono font-bold tabular-nums", goalDifference > 0 && "text-chart-2", goalDifference < 0 && "text-destructive", goalDifference === 0 && "text-muted-foreground")}>
        {goalDifference > 0 ? `+${goalDifference}` : goalDifference}
      </div>

      {/* Poeng er tallet folk leter etter — derfor storst og alene. */}
      <div className="text-right shrink-0">
        <span className="block font-display font-black text-2xl leading-none tracking-tight tabular-nums text-foreground">
          {standing.points}
        </span>
        <span className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
          Poeng
        </span>
      </div>
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
  const isTeamDirectory = false;
  const { data: teams, isLoading } = useTeams(seasonId, leagueId);
  const teamByName = new Map<string, Team>();
  for (const team of teams ?? []) teamByName.set(normalizeName(team.name), team);

  // Tabellnavn og lagnavn er ikke alltid like ("Aker" vs "Aker Topphåndball",
  // "Trondheim TH" vs "Trondheim"). Navnematching gjorde slike rader
  // uklikkbare. primeTeamId er den stabile nøkkelen, så den går først; navn
  // beholdes kun som fallback.
  const resolveTeam = (standing: LeagueStanding) =>
    getStaticTeamByPrimeId(standing.primeTeamId, seasonId, leagueId) ??
    teamByName.get(normalizeName(standing.name));

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
            <TeamDirectoryRow key={standing.primeTeamId} standing={standing} team={resolveTeam(standing)} index={index} season={seasonId} league={leagueId} />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[30px_minmax(0,1fr)_auto] md:grid-cols-[38px_minmax(0,1fr)_150px_92px_66px_auto] items-center gap-3 md:gap-4 py-2 pl-3 pr-3.5 border-b border-border bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground font-display font-bold">
            <span>#</span>
            <span>Lag</span>
            <span className="hidden md:block">Resultater</span>
            <span className="hidden md:block text-right">Mål</span>
            <span className="hidden md:block text-right">+/-</span>
            <span className="text-right">Poeng</span>
          </div>
          {standings.map((standing, index) => (
            <StandingRow key={standing.primeTeamId} standing={standing} team={resolveTeam(standing)} index={index} season={seasonId} league={leagueId} totalTeams={standings.length} />
          ))}
          {/* Tegnforklaring for fargestripen til venstre. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border bg-muted/20 px-3 py-2.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="h-[3px] w-3 rounded-full bg-chart-2" />Seier</span>
            <span className="flex items-center gap-1.5"><i className="h-[3px] w-3 rounded-full bg-chart-4" />Uavgjort</span>
            <span className="flex items-center gap-1.5"><i className="h-[3px] w-3 rounded-full bg-destructive" />Tap</span>
            <span className="ml-auto text-muted-foreground/70">Fargestripe: sluttspill / kvalifisering / nedrykk</span>
          </div>
        </section>
      )}
    </div>
  );
}
