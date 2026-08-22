import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(SCRIPT_DIR, "..");
const DATA_DIR = path.join(FRONTEND_DIR, "src", "data");
const REGISTRY_PATH = path.join(DATA_DIR, "playerIdentityRegistry.json");
const CANDIDATES_PATH = path.join(DATA_DIR, "playerIdentityCandidates.json");
const CHECK_MODE = process.argv.includes("--check");
const REGISTRY_VERSION = 1;
const FIRST_CANONICAL_ID = 1_000_001n;
const ALIAS_SOURCE = "club-roster";

function normalizeName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function aliasKey(source, externalId) {
  return `${source}:${externalId}`;
}

function compareNumericStrings(left, right) {
  const leftId = BigInt(left);
  const rightId = BigInt(right);
  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}

function sharedSuffix(values) {
  if (values.length < 2) return "";
  const reversed = values.map((value) => [...value].reverse());
  const limit = Math.min(...reversed.map((value) => value.length));
  let length = 0;
  while (
    length < limit &&
    reversed.every((value) => value[length] === reversed[0][length])
  ) {
    length += 1;
  }
  return [...reversed[0].slice(0, length)].reverse().join("");
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readRosterObservations() {
  const rosterFiles = (await readdir(DATA_DIR))
    .filter((fileName) => fileName.endsWith("Roster.json"))
    .sort((left, right) => left.localeCompare(right));
  const observations = [];

  for (const rosterFile of rosterFiles) {
    const roster = JSON.parse(
      await readFile(path.join(DATA_DIR, rosterFile), "utf8"),
    );
    if (!Array.isArray(roster)) {
      throw new Error(`${rosterFile} must contain a JSON array`);
    }

    roster.forEach((player, index) => {
      const externalId = String(player?.id ?? "");
      const name = String(player?.name ?? "").trim();
      if (!/^\d+$/.test(externalId) || !name) {
        throw new Error(
          `${rosterFile}[${index}] must have a numeric id and non-empty name`,
        );
      }
      observations.push({ externalId, name, rosterFile });
    });
  }

  return { observations, rosterFiles };
}

function emptyRegistry() {
  return {
    version: REGISTRY_VERSION,
    nextCanonicalId: FIRST_CANONICAL_ID.toString(),
    players: [],
    redirects: {},
  };
}

async function readRegistry() {
  if (!(await exists(REGISTRY_PATH))) return emptyRegistry();
  const registry = JSON.parse(await readFile(REGISTRY_PATH, "utf8"));
  if (registry.version !== REGISTRY_VERSION) {
    throw new Error(
      `Unsupported player identity registry version: ${registry.version}`,
    );
  }
  if (!Array.isArray(registry.players) || !registry.redirects) {
    throw new Error("Invalid player identity registry structure");
  }
  return registry;
}

function validateRegistry(registry) {
  const canonicalIds = new Set();
  const aliases = new Map();

  for (const player of registry.players) {
    if (!/^\d+$/.test(player.canonicalId) || !player.displayName) {
      throw new Error("Every canonical player must have a numeric id and name");
    }
    if (canonicalIds.has(player.canonicalId)) {
      throw new Error(`Duplicate canonical id: ${player.canonicalId}`);
    }
    canonicalIds.add(player.canonicalId);

    if (!Array.isArray(player.aliases) || player.aliases.length === 0) {
      throw new Error(`Canonical player ${player.canonicalId} has no aliases`);
    }
    for (const alias of player.aliases) {
      if (!alias.source || !alias.externalId) {
        throw new Error(`Invalid alias on player ${player.canonicalId}`);
      }
      const key = aliasKey(alias.source, alias.externalId);
      if (aliases.has(key)) {
        throw new Error(
          `Alias ${key} belongs to both ${aliases.get(key)} and ${player.canonicalId}`,
        );
      }
      aliases.set(key, player.canonicalId);
    }
  }

  for (const [from, to] of Object.entries(registry.redirects)) {
    if (!/^\d+$/.test(from) || !/^\d+$/.test(to) || from === to) {
      throw new Error(`Invalid canonical redirect: ${from} -> ${to}`);
    }
    if (canonicalIds.has(from)) {
      throw new Error(`Redirect source ${from} is still an active player`);
    }
    if (!canonicalIds.has(to)) {
      throw new Error(`Redirect target ${to} is not an active player`);
    }
  }

  return aliases;
}

function syncRegistry(registry, observations) {
  const aliases = validateRegistry(registry);
  let nextCanonicalId = BigInt(registry.nextCanonicalId);
  const firstObservationByExternalId = new Map();

  for (const observation of observations) {
    if (!firstObservationByExternalId.has(observation.externalId)) {
      firstObservationByExternalId.set(observation.externalId, observation);
    }
  }

  for (const observation of firstObservationByExternalId.values()) {
    const key = aliasKey(ALIAS_SOURCE, observation.externalId);
    if (aliases.has(key)) continue;

    while (
      registry.players.some(
        (player) => player.canonicalId === nextCanonicalId.toString(),
      ) ||
      Object.hasOwn(registry.redirects, nextCanonicalId.toString())
    ) {
      nextCanonicalId += 1n;
    }

    registry.players.push({
      canonicalId: nextCanonicalId.toString(),
      displayName: observation.name,
      aliases: [{ source: ALIAS_SOURCE, externalId: observation.externalId }],
    });
    aliases.set(key, nextCanonicalId.toString());
    nextCanonicalId += 1n;
  }

  registry.nextCanonicalId = nextCanonicalId.toString();
  registry.players.sort((left, right) =>
    compareNumericStrings(left.canonicalId, right.canonicalId),
  );
  for (const player of registry.players) {
    player.aliases.sort((left, right) =>
      aliasKey(left.source, left.externalId).localeCompare(
        aliasKey(right.source, right.externalId),
      ),
    );
  }

  validateRegistry(registry);
  return aliases;
}

function buildCandidateReport(registry, aliases, observations, rosterFiles) {
  const observationsByName = new Map();
  for (const observation of observations) {
    const normalizedName = normalizeName(observation.name);
    const group = observationsByName.get(normalizedName) ?? [];
    group.push(observation);
    observationsByName.set(normalizedName, group);
  }

  const candidates = [];
  for (const [normalizedName, group] of observationsByName) {
    const byExternalId = new Map();
    for (const observation of group) {
      const existing = byExternalId.get(observation.externalId) ?? {
        externalId: observation.externalId,
        canonicalId: aliases.get(
          aliasKey(ALIAS_SOURCE, observation.externalId),
        ),
        names: new Set(),
        rosterFiles: new Set(),
      };
      existing.names.add(observation.name);
      existing.rosterFiles.add(observation.rosterFile);
      byExternalId.set(observation.externalId, existing);
    }
    if (byExternalId.size < 2) continue;

    const entries = [...byExternalId.values()]
      .map((entry) => ({
        externalId: entry.externalId,
        canonicalId: entry.canonicalId,
        names: [...entry.names].sort((left, right) =>
          left.localeCompare(right),
        ),
        rosterFiles: [...entry.rosterFiles].sort((left, right) =>
          left.localeCompare(right),
        ),
      }))
      .sort((left, right) => left.externalId.localeCompare(right.externalId));
    const canonicalIds = new Set(entries.map((entry) => entry.canonicalId));
    const suffix = sharedSuffix(entries.map((entry) => entry.externalId));

    candidates.push({
      normalizedName,
      status: canonicalIds.size === 1 ? "resolved" : "needs-review",
      sharedNumericSuffix: suffix.length >= 5 ? suffix : null,
      entries,
    });
  }

  candidates.sort((left, right) =>
    left.normalizedName.localeCompare(right.normalizedName),
  );
  const needsReview = candidates.filter(
    (candidate) => candidate.status === "needs-review",
  ).length;

  return {
    version: REGISTRY_VERSION,
    summary: {
      rosterFiles: rosterFiles.length,
      rosterEntries: observations.length,
      distinctExternalIds: new Set(
        observations.map((observation) => observation.externalId),
      ).size,
      canonicalPlayers: registry.players.length,
      candidateGroups: candidates.length,
      needsReview,
      resolved: candidates.length - needsReview,
    },
    candidates,
  };
}

async function verifyOrWrite(filePath, expected) {
  const content = serialize(expected);
  if (CHECK_MODE) {
    if (!(await exists(filePath))) {
      throw new Error(`${path.basename(filePath)} is missing; run sync first`);
    }
    const current = await readFile(filePath, "utf8");
    if (current !== content) {
      throw new Error(
        `${path.basename(filePath)} is out of date; run sync first`,
      );
    }
    return;
  }
  await writeFile(filePath, content, "utf8");
}

const { observations, rosterFiles } = await readRosterObservations();
const registry = await readRegistry();
const aliases = syncRegistry(registry, observations);
const report = buildCandidateReport(
  registry,
  aliases,
  observations,
  rosterFiles,
);

await verifyOrWrite(REGISTRY_PATH, registry);
await verifyOrWrite(CANDIDATES_PATH, report);

const action = CHECK_MODE ? "verified" : "updated";
console.log(
  `Player identities ${action}: ${report.summary.canonicalPlayers} canonical players, ` +
    `${report.summary.needsReview} candidate groups need review.`,
);
