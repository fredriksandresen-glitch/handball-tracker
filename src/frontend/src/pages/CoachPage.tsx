import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Minus,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PositionBadge } from "../components/PositionBadge";
import { LeagueSelect, useSelectedLeague } from "../components/LeagueSelect";
import { SeasonSelect, useSelectedSeason } from "../components/SeasonSelect";
import { useAppRole } from "../hooks/useAppRole";
import { usePlayers } from "../hooks/usePlayers";
import { useTeams } from "../hooks/useTeams";
import {
  getStaticProfile,
  mapClawdbotMatchStats,
  mapClawdbotSeasonStats,
  type EnrichedPlayerMatchStats,
} from "../services/clawdbotPlayerProfile";
import type { Player } from "../types/handball";
import { Position } from "../types/handball";
import { resolvePlayerCardImageSources } from "../utils/playerImages";

const TEAM_KEY = "handball-tracker:coach-team";

type CoachRow = {
  player: Player;
  recent: number[];
  previous: number[];
  form?: number;
  priorForm?: number;
  delta?: number;
  matches: number;
  goals?: number;
  assists?: number;
  minutesPerMatch?: number;
  technicalErrors?: number;
  savePct?: number;
  isKeeper: boolean;
  lastOpponent?: string;
  lastDate?: string;
};

function average(values: number[]) {
  if (values.length === 0) return undefined;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function num(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return undefined;
}

function matchKey(m: EnrichedPlayerMatchStats) {
  return m.date ?? m.matchId.toString();
}

function buildRow(player: Player, season: string): CoachRow | null {
  const profile = getStaticProfile(player.id, season as never);
  if (!profile) return null;

  const isKeeper = player.position === Position.Keeper;
  const stats = mapClawdbotSeasonStats(profile);
  const all = (mapClawdbotMatchStats(profile) as EnrichedPlayerMatchStats[])
    .filter((m) =>
      isKeeper
        ? typeof m.savePct === "number" && Number(m.shotsAgainst ?? 0) >= 5
        : typeof m.mep === "number",
    )
    .sort((a, b) => matchKey(a).localeCompare(matchKey(b)));

  if (all.length === 0) return null;

  const value = (m: EnrichedPlayerMatchStats) =>
    isKeeper ? (m.savePct ?? 0) : (m.mep ?? 0);
  const recent = all.slice(-5).map(value);
  const previous = all.slice(-10, -5).map(value);
  const form = average(recent);
  const priorForm = average(previous);
  const last = all.at(-1);

  const minutes = num(stats.totalMinutes);
  const played = num(stats.matchesPlayed) ?? all.length;

  return {
    player,
    recent,
    previous,
    form,
    priorForm,
    delta:
      form !== undefined && priorForm !== undefined ? form - priorForm : undefined,
    matches: played,
    goals: num(stats.totalGoals),
    assists: num(stats.totalAssists),
    minutesPerMatch:
      minutes !== undefined && played > 0 ? minutes / played : undefined,
    technicalErrors: num(stats.technicalFaults),
    savePct: isKeeper ? form : undefined,
    isKeeper,
    lastOpponent: last?.opponent,
    lastDate: last?.date,
  };
}

function Trend({ delta }: { delta?: number }) {
  if (delta === undefined) {
    return <Minus className="size-3.5 text-muted-foreground" />;
  }
  if (delta > 0.15) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-xs font-bold text-chart-2">
        <ArrowUp className="size-3.5" />
        {delta.toFixed(1)}
      </span>
    );
  }
  if (delta < -0.15) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-xs font-bold text-destructive">
        <ArrowDown className="size-3.5" />
        {Math.abs(delta).toFixed(1)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-xs text-muted-foreground">
      <Minus className="size-3.5" />
    </span>
  );
}

function RowCard({ row, season, league }: { row: CoachRow; season: string; league: string }) {
  const img = resolvePlayerCardImageSources(row.player.imageUrl);
  return (
    <Link
      to="/player/$id"
      params={{ id: row.player.id.toString() }}
      search={{ season, league } as never}
      className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5 transition-colors last:border-0 hover:bg-muted/30"
      data-ocid="coach-player-row"
    >
      {img?.src ? (
        <img
          src={img.src}
          alt=""
          loading="lazy"
          className="size-10 shrink-0 rounded-lg object-cover object-top"
        />
      ) : (
        <span className="size-10 shrink-0 rounded-lg bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-black text-foreground">
          {row.player.name}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <PositionBadge position={row.player.position} />
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {row.matches} kamper
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className="block font-display text-lg font-black leading-none tabular-nums text-foreground">
          {row.form === undefined
            ? "-"
            : row.isKeeper
              ? `${row.form.toFixed(0)}%`
              : row.form.toFixed(1)}
        </span>
        <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          {row.isKeeper ? "Redning" : "Form"}
        </span>
      </div>
      <div className="w-12 shrink-0 text-right">
        <Trend delta={row.delta} />
      </div>
    </Link>
  );
}

function Section({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-2.5 border-b border-border px-4 py-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <h2 className="font-display text-sm font-black text-foreground">{title}</h2>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function CoachPage() {
  const seasonId = useSelectedSeason();
  const leagueId = useSelectedLeague();
  const { isCoach, isAuthenticated, principal } = useAppRole();
  const { data: teams = [] } = useTeams(seasonId, leagueId);
  const { data: players = [] } = usePlayers(seasonId, leagueId);

  const [teamId, setTeamId] = useState<string>(
    () => localStorage.getItem(TEAM_KEY) ?? "",
  );

  const squad = useMemo(
    () => players.filter((p) => p.teamId.toString() === teamId),
    [players, teamId],
  );

  const rows = useMemo(() => {
    const out: CoachRow[] = [];
    for (const p of squad) {
      const r = buildRow(p, seasonId);
      if (r) out.push(r);
    }
    return out;
  }, [squad, seasonId]);

  const byForm = useMemo(
    () => [...rows].sort((a, b) => (b.form ?? -99) - (a.form ?? -99)),
    [rows],
  );

  const rising = useMemo(
    () => [...rows].filter((r) => (r.delta ?? 0) > 0.15).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0)),
    [rows],
  );

  const attention = useMemo(
    () =>
      [...rows]
        .filter(
          (r) =>
            (r.delta ?? 0) < -0.15 ||
            (r.minutesPerMatch !== undefined && r.minutesPerMatch < 15),
        )
        .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0)),
    [rows],
  );

  function selectTeam(id: string) {
    setTeamId(id);
    localStorage.setItem(TEAM_KEY, id);
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-4" data-ocid="coach-locked">
        <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
          <ClipboardList className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-display font-bold text-foreground">
            Trenerverktøy
          </p>
          <p className="mx-auto mt-1 max-w-[280px] text-sm text-muted-foreground">
            Logg inn for å se laget ditt.
          </p>
        </div>
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="space-y-4" data-ocid="coach-not-registered">
        <div className="rounded-2xl border border-border bg-card px-5 py-8">
          <ClipboardList className="size-7 text-muted-foreground" />
          <p className="mt-3 font-display font-bold text-foreground">
            Kontoen din har ikke trenertilgang
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Trenerverktøyet er knyttet til enkeltkontoer. Send principalet under
            til den som administrerer appen, så åpnes tilgangen.
          </p>
          <code className="mt-3 block break-all rounded-lg bg-muted px-3 py-2 font-mono text-[11px] text-foreground">
            {principal}
          </code>
        </div>
      </div>
    );
  }

  const teamName = teams.find((t) => t.id.toString() === teamId)?.name;

  return (
    <div className="space-y-4" data-ocid="coach-page">
      <div className="flex flex-wrap items-center gap-2">
        <SeasonSelect compact />
        <LeagueSelect />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <label
          htmlFor="coach-team"
          className="mb-1.5 block text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground"
        >
          Mitt lag
        </label>
        <select
          id="coach-team"
          value={teamId}
          onChange={(e) => selectTeam(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-display text-sm font-bold text-foreground"
          data-ocid="coach-team-select"
        >
          <option value="">Velg lag</option>
          {teams.map((t) => (
            <option key={t.id.toString()} value={t.id.toString()}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {!teamId ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center">
          <Users className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Velg laget ditt for å se stallen.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Ingen kampdata for {teamName ?? "laget"} i {seasonId}.
          </p>
        </div>
      ) : (
        <>
          <Section
            title="Formtabell"
            subtitle={`${teamName ?? "Laget"} · snitt siste 5 kamper, med endring mot de fem før`}
            icon={TrendingUp}
          >
            {byForm.map((r) => (
              <RowCard
                key={r.player.id.toString()}
                row={r}
                season={seasonId}
                league={leagueId}
              />
            ))}
          </Section>

          {rising.length > 0 && (
            <Section
              title="I stigende form"
              subtitle="Bedre de fem siste enn de fem før"
              icon={ArrowUp}
            >
              {rising.map((r) => (
                <RowCard
                  key={r.player.id.toString()}
                  row={r}
                  season={seasonId}
                  league={leagueId}
                />
              ))}
            </Section>
          )}

          {attention.length > 0 && (
            <Section
              title="Følg med på"
              subtitle="Fallende form eller under 15 min spilletid per kamp"
              icon={AlertTriangle}
            >
              {attention.map((r) => (
                <RowCard
                  key={r.player.id.toString()}
                  row={r}
                  season={seasonId}
                  league={leagueId}
                />
              ))}
            </Section>
          )}

          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
            Form er snitt-MEP siste fem kamper for utespillere, og
            redningsprosent for keepere. Keeperkamper med under fem skudd mot
            regnes ikke med. Endringen sammenligner de fem siste mot de fem før.
          </p>
        </>
      )}
    </div>
  );
}
