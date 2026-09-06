import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Minus,
  Shield,
  Swords,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PositionBadge } from "../components/PositionBadge";
import { LeagueSelect, useSelectedLeague } from "../components/LeagueSelect";
import { SeasonSelect, useSelectedSeason } from "../components/SeasonSelect";
import { useAppRole } from "../hooks/useAppRole";
import { getStaticNextMatchForTeam } from "../data/nextMatches";
import {
  leagueStandingsBySeasonAndLeague,
  type LeagueStanding,
} from "../data/leagueStandings";
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
  suspensions?: number;
  shots?: number;
  shotPercent?: number;
  mepAvg?: number;
  mepTotal?: number;
  savePct?: number;
  saves?: number;
  isKeeper: boolean;
  group: string;
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
    suspensions: num(stats.totalTwoMin),
    shots: num(stats.totalShots),
    shotPercent: stats.shootingPercent ?? undefined,
    mepAvg: stats.mepAvg ?? undefined,
    mepTotal: stats.mepTotal ?? undefined,
    savePct: isKeeper ? form : undefined,
    saves: num(stats.totalSaves),
    isKeeper,
    group: positionGroup(player.position),
    lastOpponent: last?.opponent,
    lastDate: last?.date,
  };
}

/**
 * F10.2: fargekoding skjer innenfor posisjonsgruppe, ikke mot en absolutt
 * grense. En linjespiller og en kant skal ikke maales med samme linjal.
 */
function positionGroup(position: unknown): string {
  const p = String(position ?? "").toLowerCase();
  if (p.includes("keeper") || p.includes("m\u00e5lvakt")) return "keeper";
  if (p.includes("kant")) return "kant";
  if (p.includes("linje")) return "linje";
  if (p.includes("bak")) return "bak";
  return "annet";
}

type Tone = "good" | "neutral" | "bad" | "none";

const TONE_CLASS: Record<Tone, string> = {
  good: "text-chart-2 font-bold",
  neutral: "text-foreground",
  bad: "text-destructive font-bold",
  none: "text-muted-foreground",
};

const TONE_LABEL: Record<Tone, string> = {
  good: "Blant de beste i posisjonsgruppa",
  neutral: "Midt på treet i posisjonsgruppa",
  bad: "Blant de svakeste i posisjonsgruppa",
  none: "For få kamper til å vurderes",
};

/** Minst 3 kamper kreves for at et tall fargelegges. */
const MIN_MATCHES_FOR_TONE = 3;

/**
 * Deler verdiene i gruppa i tredjedeler. lowerIsBetter snur skalaen, slik at
 * faa tekniske feil og faa utvisninger blir groent.
 */
function toneFor(
  value: number | undefined,
  peers: number[],
  matches: number,
  lowerIsBetter = false,
): Tone {
  if (value === undefined || matches < MIN_MATCHES_FOR_TONE) return "none";
  const sorted = peers.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length < 3) return "none";
  const lowCut = sorted[Math.floor(sorted.length / 3)];
  const highCut = sorted[Math.floor((sorted.length * 2) / 3)];
  if (value >= highCut) return lowerIsBetter ? "bad" : "good";
  if (value <= lowCut) return lowerIsBetter ? "good" : "bad";
  return "neutral";
}

function Stat({
  value,
  tone,
  digits = 0,
  suffix = "",
}: {
  value?: number;
  tone: Tone;
  digits?: number;
  suffix?: string;
}) {
  if (value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <span className={cn("tabular-nums", TONE_CLASS[tone])} title={TONE_LABEL[tone]}>
      {value.toFixed(digits)}
      {suffix}
    </span>
  );
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

/** F10.4: lagets neste kamp med motstanderens noekkeltall. */
function NextOpponent({
  teamName,
  seasonId,
  leagueId,
}: {
  teamName?: string;
  seasonId: string;
  leagueId: string;
}) {
  const result = teamName
    ? getStaticNextMatchForTeam(teamName, leagueId as never)
    : null;

  if (!teamName) return null;

  // Ingen tom boks som ser ut som data: si det rett ut.
  if (!result) {
    return (
      <section className="rounded-2xl border border-border bg-card px-4 py-4">
        <div className="flex items-start gap-2.5">
          <Swords className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="font-display text-sm font-black text-foreground">
              Neste motstander
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {teamName} står ikke i terminlisten for øyeblikket. Vi viser
              ingenting framfor å gjette.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const isHome = result.homeTeamName === teamName;
  const opponent = isHome ? result.awayTeamName : result.homeTeamName;
  const startMs = Number(result.match.startTime / 1_000_000n);
  const kickoff = new Date(startMs).toLocaleString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Oppslaget er noekklet paa SeasonId/LeagueId, men her kommer de inn som
  // string. Vi typer tabellen eksplisitt framfor `as never`, som gjorde
  // resultatet til `never` og fjernet .find().
  const standingsBySeason = leagueStandingsBySeasonAndLeague as unknown as Record<
    string,
    Record<string, LeagueStanding[]>
  >;
  const table: LeagueStanding[] = standingsBySeason[seasonId]?.[leagueId] ?? [];
  const standing = table.find((row) => row.name === opponent);
  const ours = table.find((row) => row.name === teamName);

  return (
    <section
      className="rounded-2xl border border-border bg-card"
      data-ocid="coach-next-opponent"
    >
      <div className="flex items-start gap-2.5 border-b border-border px-4 py-3">
        <Swords className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <h2 className="font-display text-sm font-black text-foreground">
            Neste kamp · {isHome ? "hjemme" : "borte"} mot {opponent}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {kickoff}
            {result.match.venue ? ` · ${result.match.venue}` : ""}
          </p>
        </div>
      </div>

      {standing ? (
        <div className="grid grid-cols-3 gap-px bg-border sm:grid-cols-6">
          {[
            { label: "Plass", value: `${standing.rank}.` },
            { label: "Kamper", value: standing.played },
            { label: "Poeng", value: standing.points },
            { label: "Mål for", value: standing.goalsFor },
            { label: "Mål mot", value: standing.goalsAgainst },
            {
              label: "Diff",
              value:
                standing.goalsFor - standing.goalsAgainst > 0
                  ? `+${standing.goalsFor - standing.goalsAgainst}`
                  : standing.goalsFor - standing.goalsAgainst,
            },
          ].map((cell) => (
            <div key={cell.label} className="bg-card px-3 py-2.5 text-center">
              <span className="block font-display text-base font-black tabular-nums text-foreground">
                {cell.value}
              </span>
              <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                {cell.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-3 text-[11px] text-muted-foreground">
          {opponent} står ikke i tabellen for {seasonId} ennå.
        </p>
      )}

      {standing && ours && (
        <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
          {teamName} er nr. {ours.rank} med {ours.points} poeng ·{" "}
          {opponent} er nr. {standing.rank} med {standing.points} poeng.
        </p>
      )}
    </section>
  );
}

type Col = {
  key: string;
  label: string;
  get: (r: CoachRow) => number | undefined;
  digits?: number;
  suffix?: string;
  lowerIsBetter?: boolean;
};

const OUTFIELD_COLS: Col[] = [
  { key: "matches", label: "K", get: (r) => r.matches },
  { key: "goals", label: "Mål", get: (r) => r.goals },
  { key: "shots", label: "Skudd", get: (r) => r.shots },
  { key: "shotPct", label: "Skudd%", get: (r) => r.shotPercent, digits: 0, suffix: "%" },
  { key: "assists", label: "Assist", get: (r) => r.assists },
  { key: "tech", label: "Tekn", get: (r) => r.technicalErrors, lowerIsBetter: true },
  { key: "susp", label: "2min", get: (r) => r.suspensions, lowerIsBetter: true },
  { key: "mepAvg", label: "MEP", get: (r) => r.mepAvg, digits: 1 },
  { key: "mepTot", label: "MEP tot", get: (r) => r.mepTotal, digits: 0 },
];

/**
 * F10.3: keepere maales ikke paa skudd og mal. De feltene som finnes vises;
 * redningstall vises kun naar de faktisk er i datagrunnlaget.
 */
const KEEPER_COLS: Col[] = [
  { key: "matches", label: "K", get: (r) => r.matches },
  { key: "saves", label: "Redn", get: (r) => r.saves },
  { key: "savePct", label: "Redn%", get: (r) => r.savePct, digits: 0, suffix: "%" },
  { key: "mepAvg", label: "MEP", get: (r) => r.mepAvg, digits: 1 },
  { key: "mepTot", label: "MEP tot", get: (r) => r.mepTotal, digits: 0 },
];

function StatTable({
  rows,
  cols,
  season,
  league,
}: {
  rows: CoachRow[];
  cols: Col[];
  season: string;
  league: string;
}) {
  const [sortKey, setSortKey] = useState<string>(cols[cols.length - 2]?.key ?? "matches");
  const [desc, setDesc] = useState(true);

  // Fjerner kolonner der ingen har data, slik at vi ikke viser tomme felt
  // som ser ut som statistikk (gjelder saerlig keepernes redningstall).
  const liveCols = useMemo(
    () => cols.filter((col) => rows.some((r) => col.get(r) !== undefined)),
    [cols, rows],
  );

  // F10.2: sammenligningsgrunnlaget er spillere i samme posisjonsgruppe.
  const peersByCol = useMemo(() => {
    const map = new Map<string, Map<string, number[]>>();
    for (const col of liveCols) {
      const byGroup = new Map<string, number[]>();
      for (const r of rows) {
        const v = col.get(r);
        if (v === undefined || r.matches < MIN_MATCHES_FOR_TONE) continue;
        const list = byGroup.get(r.group) ?? [];
        list.push(v);
        byGroup.set(r.group, list);
      }
      map.set(col.key, byGroup);
    }
    return map;
  }, [liveCols, rows]);

  const sorted = useMemo(() => {
    const col = liveCols.find((c2) => c2.key === sortKey);
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      const av = col.get(a);
      const bv = col.get(b);
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      return desc ? bv - av : av - bv;
    });
  }, [rows, liveCols, sortKey, desc]);

  function toggle(key: string) {
    if (key === sortKey) setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(true);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right text-xs" data-ocid="coach-stat-table">
        <thead>
          <tr className="border-b border-border">
            <th className="sticky left-0 bg-card px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Spiller
            </th>
            {liveCols.map((col) => (
              <th key={col.key} className="px-2 py-2">
                <button
                  type="button"
                  onClick={() => toggle(col.key)}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider transition-colors hover:text-foreground",
                    sortKey === col.key ? "text-foreground" : "text-muted-foreground",
                  )}
                  title={`Sorter på ${col.label}`}
                >
                  {col.label}
                  {sortKey === col.key ? (desc ? " ↓" : " ↑") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.player.id.toString()}
              className="border-b border-border/50 last:border-0 hover:bg-muted/30"
            >
              <td className="sticky left-0 bg-card px-3 py-2 text-left">
                <Link
                  to="/player/$id"
                  params={{ id: r.player.id.toString() }}
                  search={{ season, league } as never}
                  className="block max-w-[150px] truncate font-display text-xs font-bold text-foreground hover:underline"
                >
                  {r.player.name}
                </Link>
              </td>
              {liveCols.map((col) => (
                <td key={col.key} className="px-2 py-2">
                  <Stat
                    value={col.get(r)}
                    digits={col.digits}
                    suffix={col.suffix}
                    tone={toneFor(
                      col.get(r),
                      peersByCol.get(col.key)?.get(r.group) ?? [],
                      r.matches,
                      col.lowerIsBetter,
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

  const outfield = useMemo(() => rows.filter((r) => !r.isKeeper), [rows]);
  const keepers = useMemo(() => rows.filter((r) => r.isKeeper), [rows]);

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
          <NextOpponent
            teamName={teamName}
            seasonId={seasonId}
            leagueId={leagueId}
          />

          <Section
            title="Sesongstatistikk · utespillere"
            subtitle="Farge viser hvor spilleren ligger mot lagkameratene i samme posisjonsgruppe. Trykk på en kolonne for å sortere."
            icon={ClipboardList}
          >
            {outfield.length > 0 ? (
              <StatTable
                rows={outfield}
                cols={OUTFIELD_COLS}
                season={seasonId}
                league={leagueId}
              />
            ) : (
              <p className="px-4 py-4 text-[11px] text-muted-foreground">
                Ingen utespillere med kampdata.
              </p>
            )}
          </Section>

          <Section
            title="Keepere"
            subtitle="Keepere måles ikke på skudd og mål"
            icon={Shield}
          >
            {keepers.length > 0 ? (
              <StatTable
                rows={keepers}
                cols={KEEPER_COLS}
                season={seasonId}
                league={leagueId}
              />
            ) : (
              <p className="px-4 py-4 text-[11px] leading-relaxed text-muted-foreground">
                Ingen keepere med kampdata for {teamName ?? "laget"} i{" "}
                {seasonId}. Redningsstatistikk (redninger og redningsprosent)
                finnes ikke i datagrunnlaget ennå — kolonnene dukker opp av seg
                selv når tallene hentes inn fra kilden.
              </p>
            )}
          </Section>

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
