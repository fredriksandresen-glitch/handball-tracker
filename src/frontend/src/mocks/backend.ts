import type { backendInterface, FeedEvent, Player, PlayerMatchStats, PlayerSeasonStats, Match, Team } from "../backend";
import { FeedEventType, MatchStatus, Position } from "../backend";
import { Principal } from "@icp-sdk/core/principal";

const now = BigInt(Date.now()) * BigInt(1_000_000);
const oneDay = BigInt(86_400_000_000_000);

// Teams mirror backend seed data exactly (same IDs, slugs, names) — all 14 REMA 1000-ligaen teams
const teams: Team[] = [
  { id: BigInt(1),  name: "Sola HK",                slug: "sola-hk",               matchesPlayed: BigInt(18), points: BigInt(34), goalDifference: BigInt(22),  standingsRank: BigInt(1)  },
  { id: BigInt(2),  name: "Larvik HK",              slug: "larvik-hk",             matchesPlayed: BigInt(18), points: BigInt(32), goalDifference: BigInt(18),  standingsRank: BigInt(2)  },
  { id: BigInt(3),  name: "Storhamar Elite",        slug: "storhamar-elite",       matchesPlayed: BigInt(18), points: BigInt(30), goalDifference: BigInt(15),  standingsRank: BigInt(3)  },
  { id: BigInt(4),  name: "Molde Elite",            slug: "molde-elite",           matchesPlayed: BigInt(18), points: BigInt(26), goalDifference: BigInt(8),   standingsRank: BigInt(4)  },
  { id: BigInt(5),  name: "Tertnes Elite",          slug: "tertnes-elite",         matchesPlayed: BigInt(18), points: BigInt(22), goalDifference: BigInt(-2),  standingsRank: BigInt(5)  },
  { id: BigInt(6),  name: "Fana HK",                slug: "fana-hk",               matchesPlayed: BigInt(18), points: BigInt(20), goalDifference: BigInt(-4),  standingsRank: BigInt(6)  },
  { id: BigInt(7),  name: "Fjellhammer IL",         slug: "fjellhammer-il",        matchesPlayed: BigInt(18), points: BigInt(18), goalDifference: BigInt(-10), standingsRank: BigInt(7)  },
  { id: BigInt(8),  name: "Byåsen IL",              slug: "byasen-il",             matchesPlayed: BigInt(18), points: BigInt(16), goalDifference: BigInt(-14), standingsRank: BigInt(8)  },
  { id: BigInt(9),  name: "Vipers Kristiansand",    slug: "vipers-kristiansand",   matchesPlayed: BigInt(18), points: BigInt(14), goalDifference: BigInt(-18), standingsRank: BigInt(9)  },
  { id: BigInt(10), name: "Glassverket IF",         slug: "glassverket-if",        matchesPlayed: BigInt(18), points: BigInt(12), goalDifference: BigInt(-22), standingsRank: BigInt(10) },
  { id: BigInt(11), name: "Kolstad Håndball",       slug: "kolstad-handball",      matchesPlayed: BigInt(18), points: BigInt(10), goalDifference: BigInt(-28), standingsRank: BigInt(11) },
  { id: BigInt(12), name: "Stabæk Håndball",        slug: "stabak-handball",       matchesPlayed: BigInt(18), points: BigInt(8),  goalDifference: BigInt(-32), standingsRank: BigInt(12) },
  { id: BigInt(13), name: "Fredrikstad BK",         slug: "fredrikstad-bk",        matchesPlayed: BigInt(18), points: BigInt(6),  goalDifference: BigInt(-38), standingsRank: BigInt(13) },
  { id: BigInt(14), name: "Nærbø IL",               slug: "narbo-il",              matchesPlayed: BigInt(18), points: BigInt(4),  goalDifference: BigInt(-44), standingsRank: BigInt(14) },
];

// Players mirror backend seed data (IDs 1–92, same team assignments)
const players: Player[] = [
  // ── Sola HK (id 1) ──
  { id: BigInt(1),  name: "Silje Solberg",           slug: "silje-solberg",           teamId: BigInt(1), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(2),  name: "Katrine Lunde",           slug: "katrine-lunde",           teamId: BigInt(1), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(3),  name: "Camilla Herrem",          slug: "camilla-herrem",          teamId: BigInt(1), position: Position.VenstreKant, jerseyNumber: BigInt(77), isActive: true, nationality: "NOR", imageUrl: "/assets/generated/camilla-herrem.dim_600x800.jpg" },
  { id: BigInt(4),  name: "Kristine Breistøl",       slug: "kristine-breistol",       teamId: BigInt(1), position: Position.HoyreKant,  jerseyNumber: BigInt(17), isActive: true, nationality: "NOR" },
  { id: BigInt(5),  name: "Nora Mørk",               slug: "nora-mork",               teamId: BigInt(1), position: Position.Bakspiller,  jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(6),  name: "Stine Bredal Oftedal",    slug: "stine-bredal-oftedal",    teamId: BigInt(1), position: Position.Bakspiller,  jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },
  { id: BigInt(7),  name: "Marit Røsberg Jacobsen",  slug: "marit-rosberg-jacobsen",  teamId: BigInt(1), position: Position.Bakspiller,  jerseyNumber: BigInt(14), isActive: true, nationality: "NOR" },
  { id: BigInt(8),  name: "Veronica Kristiansen",    slug: "veronica-kristiansen",    teamId: BigInt(1), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(9),  name: "Linn Jørum Sulland",      slug: "linn-jorum-sulland",      teamId: BigInt(1), position: Position.Bakspiller,  jerseyNumber: BigInt(5),  isActive: true, nationality: "NOR" },
  { id: BigInt(10), name: "Marte Løseth",            slug: "marte-loseth",            teamId: BigInt(1), position: Position.HoyreKant,  jerseyNumber: BigInt(3),  isActive: true, nationality: "NOR" },

  // ── Larvik HK (id 2) ──
  { id: BigInt(11), name: "Rikke Selvik",            slug: "rikke-selvik",            teamId: BigInt(2), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(12), name: "Cecilie Grønnes",         slug: "cecilie-gronnes",         teamId: BigInt(2), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(13), name: "Amanda Kurtovic",         slug: "amanda-kurtovic",         teamId: BigInt(2), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(14), name: "Ida Alstad",              slug: "ida-alstad",              teamId: BigInt(8), position: Position.HoyreKant,  jerseyNumber: BigInt(11), isActive: true, nationality: "NOR", imageUrl: "/assets/ida-alstad.jpg" },
  { id: BigInt(15), name: "Heidi Løke",              slug: "heidi-loke",              teamId: BigInt(2), position: Position.Linje,       jerseyNumber: BigInt(4),  isActive: true, nationality: "NOR" },
  { id: BigInt(16), name: "Karoline Alling",         slug: "karoline-alling",         teamId: BigInt(2), position: Position.Bakspiller,  jerseyNumber: BigInt(6),  isActive: true, nationality: "NOR" },
  { id: BigInt(17), name: "Thea Mørk",               slug: "thea-mork",               teamId: BigInt(2), position: Position.Bakspiller,  jerseyNumber: BigInt(13), isActive: true, nationality: "NOR" },
  { id: BigInt(18), name: "Emilie Hegh Arntzen",     slug: "emilie-hegh-arntzen",     teamId: BigInt(2), position: Position.HoyreKant,  jerseyNumber: BigInt(15), isActive: true, nationality: "NOR" },
  { id: BigInt(19), name: "Ingrid Kristiansen",      slug: "ingrid-kristiansen",      teamId: BigInt(2), position: Position.VenstreKant, jerseyNumber: BigInt(3),  isActive: true, nationality: "NOR" },
  { id: BigInt(20), name: "Sanna Solberg-Isaksen",   slug: "sanna-solberg-isaksen",   teamId: BigInt(2), position: Position.Bakspiller,  jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },

  // ── Storhamar Elite (id 3) ──
  { id: BigInt(21), name: "Silje Eugenie Ljungberg", slug: "silje-eugenie-ljungberg", teamId: BigInt(3), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(22), name: "Mari Molid",              slug: "mari-molid",              teamId: BigInt(3), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(23), name: "Eline Tjørneby Nygaard",  slug: "eline-tjorneby-nygaard",  teamId: BigInt(3), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(24), name: "Ingrid Bakkerud",         slug: "ingrid-bakkerud",         teamId: BigInt(3), position: Position.HoyreKant,  jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(25), name: "Marte Eldevik Ny",        slug: "marte-eldevik-ny",        teamId: BigInt(3), position: Position.Linje,       jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },
  { id: BigInt(26), name: "Hanna Yttereng",          slug: "hanna-yttereng",          teamId: BigInt(3), position: Position.Bakspiller,  jerseyNumber: BigInt(5),  isActive: true, nationality: "NOR" },
  { id: BigInt(27), name: "Kristine Nørdby",         slug: "kristine-nordby",         teamId: BigInt(3), position: Position.Bakspiller,  jerseyNumber: BigInt(8),  isActive: true, nationality: "NOR" },
  { id: BigInt(28), name: "Julie Blågestad",         slug: "julie-blagestad",         teamId: BigInt(3), position: Position.Bakspiller,  jerseyNumber: BigInt(14), isActive: true, nationality: "NOR" },
  { id: BigInt(29), name: "Pernille Helene Wibe",    slug: "pernille-helene-wibe",    teamId: BigInt(3), position: Position.Linje,       jerseyNumber: BigInt(6),  isActive: true, nationality: "NOR" },
  { id: BigInt(30), name: "Oda Narten",              slug: "oda-narten",              teamId: BigInt(3), position: Position.VenstreKant, jerseyNumber: BigInt(3),  isActive: true, nationality: "NOR" },

  // ── Molde Elite (id 4) ──
  { id: BigInt(31), name: "Mia Rej",                 slug: "mia-rej",                 teamId: BigInt(4), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(32), name: "Malin Dahlum",            slug: "malin-dahlum",            teamId: BigInt(4), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(33), name: "Maiken Margrete Hesselberg", slug: "maiken-margrete-hesselberg", teamId: BigInt(4), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(34), name: "Annette Hageberg",        slug: "annette-hageberg",        teamId: BigInt(4), position: Position.HoyreKant,  jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(35), name: "Marte Malene Tomter",     slug: "marte-malene-tomter",     teamId: BigInt(4), position: Position.Linje,       jerseyNumber: BigInt(4),  isActive: true, nationality: "NOR" },
  { id: BigInt(36), name: "Hannah Cathrine Ytreberg", slug: "hannah-cathrine-ytreberg", teamId: BigInt(4), position: Position.Bakspiller,  jerseyNumber: BigInt(6),  isActive: true, nationality: "NOR" },
  { id: BigInt(37), name: "Andrea Austmo Pedersen",  slug: "andrea-austmo-pedersen",  teamId: BigInt(4), position: Position.Bakspiller,  jerseyNumber: BigInt(13), isActive: true, nationality: "NOR" },
  { id: BigInt(38), name: "Kristin Nørstebø",        slug: "kristin-norstebo",        teamId: BigInt(4), position: Position.HoyreKant,  jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },
  { id: BigInt(39), name: "Emilie Christoffersen",   slug: "emilie-christoffersen",   teamId: BigInt(4), position: Position.Linje,       jerseyNumber: BigInt(12), isActive: true, nationality: "NOR" },
  { id: BigInt(40), name: "Randi Gustad",            slug: "randi-gustad",            teamId: BigInt(4), position: Position.VenstreKant, jerseyNumber: BigInt(3),  isActive: true, nationality: "NOR" },

  // ── Tertnes Elite (id 5) ──
  { id: BigInt(41), name: "Johanne Prøsch Urdal",    slug: "johanne-prosch-urdal",    teamId: BigInt(5), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(42), name: "Emma Friis",              slug: "emma-friis",              teamId: BigInt(5), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(43), name: "Kine Bakke",              slug: "kine-bakke",              teamId: BigInt(5), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(44), name: "Helene Fauske",           slug: "helene-fauske",           teamId: BigInt(5), position: Position.HoyreKant,  jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(45), name: "Marte Grønning",          slug: "marte-gronning",          teamId: BigInt(5), position: Position.Linje,       jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },
  { id: BigInt(46), name: "Synne Bjerum",            slug: "synne-bjerum",            teamId: BigInt(5), position: Position.Bakspiller,  jerseyNumber: BigInt(5),  isActive: true, nationality: "NOR" },
  { id: BigInt(47), name: "Karoline Wenaas",         slug: "karoline-wenaas",         teamId: BigInt(5), position: Position.Bakspiller,  jerseyNumber: BigInt(8),  isActive: true, nationality: "NOR" },
  { id: BigInt(48), name: "Kristine Marie Dahl",     slug: "kristine-marie-dahl",     teamId: BigInt(5), position: Position.Bakspiller,  jerseyNumber: BigInt(14), isActive: true, nationality: "NOR" },
  { id: BigInt(49), name: "Tonje Larsen",            slug: "tonje-larsen",            teamId: BigInt(5), position: Position.Linje,       jerseyNumber: BigInt(6),  isActive: true, nationality: "NOR" },
  { id: BigInt(50), name: "Mari Eliassen",           slug: "mari-eliassen",           teamId: BigInt(5), position: Position.HoyreKant,  jerseyNumber: BigInt(3),  isActive: true, nationality: "NOR" },

  // ── Fana HK (id 6) ──
  { id: BigInt(51), name: "Thea Johanessen",         slug: "thea-johanessen",         teamId: BigInt(6), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(52), name: "Ingrid Moe Elstad",       slug: "ingrid-moe-elstad",       teamId: BigInt(6), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(53), name: "Ingvild Bakkerud",        slug: "ingvild-bakkerud",        teamId: BigInt(6), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(54), name: "Signe Øverås Davidsen",   slug: "signe-overas-davidsen",   teamId: BigInt(6), position: Position.HoyreKant,  jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(55), name: "Helene Gigstad",          slug: "helene-gigstad",          teamId: BigInt(6), position: Position.Linje,       jerseyNumber: BigInt(4),  isActive: true, nationality: "NOR" },
  { id: BigInt(56), name: "Helene Rønning",          slug: "helene-ronning",          teamId: BigInt(6), position: Position.Bakspiller,  jerseyNumber: BigInt(6),  isActive: true, nationality: "NOR" },
  { id: BigInt(57), name: "Renate Johannesen",       slug: "renate-johannesen",       teamId: BigInt(6), position: Position.Bakspiller,  jerseyNumber: BigInt(13), isActive: true, nationality: "NOR" },
  { id: BigInt(58), name: "Emilie Bernau",           slug: "emilie-bernau",           teamId: BigInt(6), position: Position.HoyreKant,  jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },
  { id: BigInt(59), name: "Mia Samuelsen",           slug: "mia-samuelsen",           teamId: BigInt(6), position: Position.Linje,       jerseyNumber: BigInt(12), isActive: true, nationality: "NOR" },
  { id: BigInt(60), name: "Silje Moen",              slug: "silje-moen",              teamId: BigInt(6), position: Position.VenstreKant, jerseyNumber: BigInt(3),  isActive: true, nationality: "NOR" },

  // ── Fjellhammer HK (id 7) — full real roster ──
  { id: BigInt(61), name: "Linnea Isabel Ingeborg Aula", slug: "linnea-isabel-ingeborg-aula", teamId: BigInt(7), position: Position.Bakspiller,  jerseyNumber: BigInt(18), isActive: true, nationality: "NOR" },
  { id: BigInt(62), name: "Zaynab Elmrani",          slug: "zaynab-elmrani",          teamId: BigInt(7), position: Position.Bakspiller,  jerseyNumber: BigInt(12), isActive: true, nationality: "NOR" },
  { id: BigInt(63), name: "Ida Wall Bakken",         slug: "ida-wall-bakken",         teamId: BigInt(7), position: Position.Keeper,      jerseyNumber: BigInt(37), isActive: true, nationality: "NOR" },
  { id: BigInt(64), name: "Martine Tveter",          slug: "martine-tveter",          teamId: BigInt(7), position: Position.Bakspiller,  jerseyNumber: BigInt(4),  isActive: true, nationality: "NOR" },
  { id: BigInt(65), name: "Birta Run Grétarsdottir", slug: "birta-run-gretarsdottir", teamId: BigInt(7), position: Position.VenstreKant, jerseyNumber: BigInt(8),  isActive: true, nationality: "ISL" },
  { id: BigInt(66), name: "Hannah Deari Solheim",    slug: "hannah-deari-solheim",    teamId: BigInt(7), position: Position.HoyreKant,  jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },
  { id: BigInt(67), name: "Mia Lundberg Lersbryggen", slug: "mia-lundberg-lersbryggen", teamId: BigInt(7), position: Position.Linje,      jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(68), name: "Sarah Deari Solheim",     slug: "sarah-deari-solheim",     teamId: BigInt(7), position: Position.VenstreKant, jerseyNumber: BigInt(14), isActive: true, nationality: "NOR", imageUrl: "/assets/sara-solheim.jpg" },
  { id: BigInt(69), name: "Christina Midtdal Nummestad", slug: "christina-midtdal-nummestad", teamId: BigInt(7), position: Position.Keeper, jerseyNumber: BigInt(15), isActive: true, nationality: "NOR" },
  { id: BigInt(70), name: "Marie Elstrand Munthe",   slug: "marie-elstrand-munthe",   teamId: BigInt(7), position: Position.HoyreKant,  jerseyNumber: BigInt(17), isActive: true, nationality: "NOR" },
  { id: BigInt(71), name: "Emma Egge Edner",         slug: "emma-egge-edner",         teamId: BigInt(7), position: Position.Bakspiller,  jerseyNumber: BigInt(25), isActive: true, nationality: "NOR" },
  { id: BigInt(72), name: "Marthe Bjørnson Ulvåknippa", slug: "marthe-bjornson-ulvaknippa", teamId: BigInt(7), position: Position.Linje,  jerseyNumber: BigInt(27), isActive: true, nationality: "NOR" },
  { id: BigInt(73), name: "Mathilde Aas Fjelddalen", slug: "mathilde-aas-fjelddalen", teamId: BigInt(7), position: Position.Bakspiller,  jerseyNumber: BigInt(33), isActive: true, nationality: "NOR" },
  { id: BigInt(74), name: "Stine Mellemstrand Bore", slug: "stine-mellemstrand-bore", teamId: BigInt(7), position: Position.HoyreKant,  jerseyNumber: BigInt(72), isActive: true, nationality: "NOR" },
  { id: BigInt(75), name: "My Lervold",              slug: "my-lervold",              teamId: BigInt(7), position: Position.VenstreKant, jerseyNumber: BigInt(2),  isActive: true, nationality: "NOR" },
  { id: BigInt(76), name: "Julie Rensmoen Benterud", slug: "julie-rensmoen-benterud", teamId: BigInt(7), position: Position.Bakspiller,  jerseyNumber: BigInt(5),  isActive: true, nationality: "NOR" },
  { id: BigInt(77), name: "Sara Ashuri",             slug: "sara-ashuri",             teamId: BigInt(7), position: Position.Keeper,      jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(78), name: "Hedda Klippen Nilsen",    slug: "hedda-klippen-nilsen",    teamId: BigInt(7), position: Position.Linje,       jerseyNumber: BigInt(20), isActive: true, nationality: "NOR" },
  { id: BigInt(79), name: "Tuva Knai",               slug: "tuva-knai",               teamId: BigInt(7), position: Position.Bakspiller,  jerseyNumber: BigInt(6),  isActive: true, nationality: "NOR" },
  { id: BigInt(80), name: "Inga Sandvold",           slug: "inga-sandvold",           teamId: BigInt(7), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(81), name: "Sunniva Sogn-Johansen",   slug: "sunniva-sogn-johansen",   teamId: BigInt(7), position: Position.HoyreKant,  jerseyNumber: BigInt(22), isActive: true, nationality: "NOR" },
  { id: BigInt(82), name: "Tuva Svensson",           slug: "tuva-svensson",           teamId: BigInt(7), position: Position.Bakspiller,  jerseyNumber: BigInt(45), isActive: true, nationality: "NOR" },

  // ── Byåsen IL (id 8) ──
  { id: BigInt(83), name: "Helene Fjellestad",       slug: "helene-fjellestad",       teamId: BigInt(8), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(84), name: "Ingrid Bergmann Sagen",   slug: "ingrid-bergmann-sagen",   teamId: BigInt(8), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(85), name: "Thea Mørk Hermansen",     slug: "thea-mork-hermansen",     teamId: BigInt(8), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(86), name: "Martine Haugdal",         slug: "martine-haugdal",         teamId: BigInt(8), position: Position.HoyreKant,  jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(87), name: "Emilie Møller",           slug: "emilie-moller",           teamId: BigInt(8), position: Position.Linje,       jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },
  { id: BigInt(88), name: "Mari Breivik Sætre",      slug: "mari-breivik-saetre",     teamId: BigInt(8), position: Position.Bakspiller,  jerseyNumber: BigInt(5),  isActive: true, nationality: "NOR" },
  { id: BigInt(89), name: "Silje Waade",             slug: "silje-waade",             teamId: BigInt(8), position: Position.Bakspiller,  jerseyNumber: BigInt(8),  isActive: true, nationality: "NOR" },
  { id: BigInt(90), name: "Kristine Skuland",        slug: "kristine-skuland",        teamId: BigInt(8), position: Position.Bakspiller,  jerseyNumber: BigInt(14), isActive: true, nationality: "NOR" },
  { id: BigInt(91), name: "Marta Tomac",             slug: "marta-tomac",             teamId: BigInt(8), position: Position.Linje,       jerseyNumber: BigInt(6),  isActive: true, nationality: "CRO" },
  { id: BigInt(92), name: "Ane Cecilie Røsberg",     slug: "ane-cecilie-rosberg",     teamId: BigInt(8), position: Position.VenstreKant, jerseyNumber: BigInt(3),  isActive: true, nationality: "NOR" },

  // ── Vipers Kristiansand (id 9) ──
  { id: BigInt(93),  name: "Katrine Lunde Haraldsen",  slug: "katrine-lunde-haraldsen",  teamId: BigInt(9), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(94),  name: "Ragnhild Valle",           slug: "ragnhild-valle",           teamId: BigInt(9), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(95),  name: "Isabelle Gulldén",         slug: "isabelle-gullden",         teamId: BigInt(9), position: Position.Bakspiller,  jerseyNumber: BigInt(7),  isActive: true, nationality: "SWE" },
  { id: BigInt(96),  name: "Henny Reistad",            slug: "henny-reistad",            teamId: BigInt(9), position: Position.Bakspiller,  jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(97),  name: "Tess Wester",              slug: "tess-wester",              teamId: BigInt(9), position: Position.Keeper,      jerseyNumber: BigInt(33), isActive: true, nationality: "NED" },
  { id: BigInt(98),  name: "Grace Zaadi Deuna",        slug: "grace-zaadi-deuna",        teamId: BigInt(9), position: Position.Bakspiller,  jerseyNumber: BigInt(9),  isActive: true, nationality: "CMR" },
  { id: BigInt(99),  name: "Nathalie Hagman",          slug: "nathalie-hagman",          teamId: BigInt(9), position: Position.HoyreKant,  jerseyNumber: BigInt(11), isActive: true, nationality: "SWE" },
  { id: BigInt(100), name: "Rikke Poulsen",            slug: "rikke-poulsen",            teamId: BigInt(9), position: Position.VenstreKant, jerseyNumber: BigInt(5),  isActive: true, nationality: "DEN" },
  { id: BigInt(101), name: "Marit Malm Frafjord",      slug: "marit-malm-frafjord",      teamId: BigInt(9), position: Position.Linje,       jerseyNumber: BigInt(4),  isActive: true, nationality: "NOR" },
  { id: BigInt(102), name: "Heidi Løke Andersen",      slug: "heidi-loke-andersen",      teamId: BigInt(9), position: Position.Linje,       jerseyNumber: BigInt(6),  isActive: true, nationality: "NOR" },
  { id: BigInt(103), name: "Moa Anhede",               slug: "moa-anhede",               teamId: BigInt(9), position: Position.VenstreKant, jerseyNumber: BigInt(8),  isActive: true, nationality: "SWE" },
  { id: BigInt(104), name: "Marketa Jerabkova",        slug: "marketa-jerabkova",        teamId: BigInt(9), position: Position.HoyreKant,  jerseyNumber: BigInt(13), isActive: true, nationality: "CZE" },
  { id: BigInt(105), name: "Marta Tomac Vipers",       slug: "marta-tomac-vipers",       teamId: BigInt(9), position: Position.Linje,       jerseyNumber: BigInt(14), isActive: true, nationality: "CRO" },
  { id: BigInt(106), name: "Maja Tomac",               slug: "maja-tomac",               teamId: BigInt(9), position: Position.Bakspiller,  jerseyNumber: BigInt(15), isActive: true, nationality: "CRO" },

  // ── Glassverket IF (id 10) ──
  { id: BigInt(107), name: "Maja Jakobsen",            slug: "maja-jakobsen",            teamId: BigInt(10), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(108), name: "Ingrid Nørvåg Hegdal",     slug: "ingrid-norvag-hegdal",     teamId: BigInt(10), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(109), name: "Marte Michelsen",          slug: "marte-michelsen",          teamId: BigInt(10), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(110), name: "Kristin Haugen",           slug: "kristin-haugen",           teamId: BigInt(10), position: Position.HoyreKant,  jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(111), name: "Karoline Sand",            slug: "karoline-sand",            teamId: BigInt(10), position: Position.Linje,       jerseyNumber: BigInt(4),  isActive: true, nationality: "NOR" },
  { id: BigInt(112), name: "Sigrid Lund",              slug: "sigrid-lund",              teamId: BigInt(10), position: Position.Bakspiller,  jerseyNumber: BigInt(6),  isActive: true, nationality: "NOR" },
  { id: BigInt(113), name: "Astrid Berge",             slug: "astrid-berge",             teamId: BigInt(10), position: Position.Bakspiller,  jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },
  { id: BigInt(114), name: "Tonje Nøstvold",           slug: "tonje-nostvold",           teamId: BigInt(10), position: Position.Bakspiller,  jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(115), name: "Line Jørgensen",           slug: "line-jorgensen",           teamId: BigInt(10), position: Position.VenstreKant, jerseyNumber: BigInt(3),  isActive: true, nationality: "NOR" },
  { id: BigInt(116), name: "Stine Andreassen",         slug: "stine-andreassen",         teamId: BigInt(10), position: Position.HoyreKant,  jerseyNumber: BigInt(14), isActive: true, nationality: "NOR" },
  { id: BigInt(117), name: "Hilde Bakken",             slug: "hilde-bakken",             teamId: BigInt(10), position: Position.Linje,       jerseyNumber: BigInt(5),  isActive: true, nationality: "NOR" },
  { id: BigInt(118), name: "Sofie Grønvold",           slug: "sofie-gronvold",           teamId: BigInt(10), position: Position.Bakspiller,  jerseyNumber: BigInt(8),  isActive: true, nationality: "NOR" },
  { id: BigInt(119), name: "Renate Larsen",            slug: "renate-larsen",            teamId: BigInt(10), position: Position.VenstreKant, jerseyNumber: BigInt(17), isActive: true, nationality: "NOR" },
  { id: BigInt(120), name: "Thea Kristiansen",         slug: "thea-kristiansen",         teamId: BigInt(10), position: Position.HoyreKant,  jerseyNumber: BigInt(21), isActive: true, nationality: "NOR" },

  // ── Kolstad Håndball (id 11) ──
  { id: BigInt(121), name: "Emilie Arntzen",           slug: "emilie-arntzen",           teamId: BigInt(11), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(122), name: "Sandra Andersen",          slug: "sandra-andersen",          teamId: BigInt(11), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(123), name: "Pernille Wibe",            slug: "pernille-wibe",            teamId: BigInt(11), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(124), name: "Stine Skogrand",           slug: "stine-skogrand",           teamId: BigInt(11), position: Position.HoyreKant,  jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(125), name: "Mina Andresen",            slug: "mina-andresen",            teamId: BigInt(11), position: Position.Linje,       jerseyNumber: BigInt(4),  isActive: true, nationality: "NOR" },
  { id: BigInt(126), name: "Ingrid Thorvaldsen",       slug: "ingrid-thorvaldsen",       teamId: BigInt(11), position: Position.Bakspiller,  jerseyNumber: BigInt(6),  isActive: true, nationality: "NOR" },
  { id: BigInt(127), name: "Lena Grimsbø",             slug: "lena-grimsbo",             teamId: BigInt(11), position: Position.Keeper,      jerseyNumber: BigInt(12), isActive: true, nationality: "NOR" },
  { id: BigInt(128), name: "Maja Vesterby",            slug: "maja-vesterby",            teamId: BigInt(11), position: Position.Bakspiller,  jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },
  { id: BigInt(129), name: "Caroline Alstad",          slug: "caroline-alstad",          teamId: BigInt(11), position: Position.HoyreKant,  jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(130), name: "Silje Solberg Kolstad",    slug: "silje-solberg-kolstad",    teamId: BigInt(11), position: Position.Bakspiller,  jerseyNumber: BigInt(8),  isActive: true, nationality: "NOR" },
  { id: BigInt(131), name: "Mari Hegdal",              slug: "mari-hegdal",              teamId: BigInt(11), position: Position.VenstreKant, jerseyNumber: BigInt(14), isActive: true, nationality: "NOR" },
  { id: BigInt(132), name: "Emma Kristoffersen",       slug: "emma-kristoffersen",       teamId: BigInt(11), position: Position.Linje,       jerseyNumber: BigInt(5),  isActive: true, nationality: "NOR" },
  { id: BigInt(133), name: "Kine Nilsen",              slug: "kine-nilsen",              teamId: BigInt(11), position: Position.Bakspiller,  jerseyNumber: BigInt(3),  isActive: true, nationality: "NOR" },
  { id: BigInt(134), name: "Sunniva Berg",             slug: "sunniva-berg",             teamId: BigInt(11), position: Position.HoyreKant,  jerseyNumber: BigInt(17), isActive: true, nationality: "NOR" },

  // ── Stabæk Håndball (id 12) ──
  { id: BigInt(135), name: "Vilde Mortensen Ingstad",  slug: "vilde-mortensen-ingstad",  teamId: BigInt(12), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(136), name: "Maria Hagen",              slug: "maria-hagen",              teamId: BigInt(12), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(137), name: "Julie Jacobsen",           slug: "julie-jacobsen",           teamId: BigInt(12), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(138), name: "Thea Nielsen",             slug: "thea-nielsen",             teamId: BigInt(12), position: Position.HoyreKant,  jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(139), name: "Sara Gjøen",               slug: "sara-gjoen",               teamId: BigInt(12), position: Position.Linje,       jerseyNumber: BigInt(4),  isActive: true, nationality: "NOR" },
  { id: BigInt(140), name: "Ingrid Solvang",           slug: "ingrid-solvang",           teamId: BigInt(12), position: Position.Bakspiller,  jerseyNumber: BigInt(6),  isActive: true, nationality: "NOR" },
  { id: BigInt(141), name: "Hanna Aardal",             slug: "hanna-aardal",             teamId: BigInt(12), position: Position.Bakspiller,  jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },
  { id: BigInt(142), name: "Martine Holm",             slug: "martine-holm",             teamId: BigInt(12), position: Position.HoyreKant,  jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(143), name: "Nora Berntsen",            slug: "nora-berntsen",            teamId: BigInt(12), position: Position.VenstreKant, jerseyNumber: BigInt(3),  isActive: true, nationality: "NOR" },
  { id: BigInt(144), name: "Emilie Bruseth",           slug: "emilie-bruseth",           teamId: BigInt(12), position: Position.Bakspiller,  jerseyNumber: BigInt(14), isActive: true, nationality: "NOR" },
  { id: BigInt(145), name: "Line Bergmann",            slug: "line-bergmann",            teamId: BigInt(12), position: Position.Linje,       jerseyNumber: BigInt(5),  isActive: true, nationality: "NOR" },
  { id: BigInt(146), name: "Silje Engen",              slug: "silje-engen",              teamId: BigInt(12), position: Position.Bakspiller,  jerseyNumber: BigInt(8),  isActive: true, nationality: "NOR" },
  { id: BigInt(147), name: "Karianne Lund",            slug: "karianne-lund",            teamId: BigInt(12), position: Position.VenstreKant, jerseyNumber: BigInt(17), isActive: true, nationality: "NOR" },
  { id: BigInt(148), name: "Anna Rosvoll",             slug: "anna-rosvoll",             teamId: BigInt(12), position: Position.HoyreKant,  jerseyNumber: BigInt(21), isActive: true, nationality: "NOR" },

  // ── Fredrikstad BK (id 13) ──
  { id: BigInt(149), name: "Camilla Johansen",         slug: "camilla-johansen",         teamId: BigInt(13), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(150), name: "Marte Enersen",            slug: "marte-enersen",            teamId: BigInt(13), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(151), name: "Silje Nygaard",            slug: "silje-nygaard",            teamId: BigInt(13), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(152), name: "Tonje Hansen",             slug: "tonje-hansen",             teamId: BigInt(13), position: Position.HoyreKant,  jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(153), name: "Ida Kristiansen",          slug: "ida-kristiansen",          teamId: BigInt(13), position: Position.Linje,       jerseyNumber: BigInt(4),  isActive: true, nationality: "NOR" },
  { id: BigInt(154), name: "Marit Halvorsen",          slug: "marit-halvorsen",          teamId: BigInt(13), position: Position.Bakspiller,  jerseyNumber: BigInt(6),  isActive: true, nationality: "NOR" },
  { id: BigInt(155), name: "Siri Andresen",            slug: "siri-andresen",            teamId: BigInt(13), position: Position.Bakspiller,  jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },
  { id: BigInt(156), name: "Anette Nilsen",            slug: "anette-nilsen",            teamId: BigInt(13), position: Position.HoyreKant,  jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(157), name: "Karianne Breivik",         slug: "karianne-breivik",         teamId: BigInt(13), position: Position.VenstreKant, jerseyNumber: BigInt(3),  isActive: true, nationality: "NOR" },
  { id: BigInt(158), name: "Nina Haugen",              slug: "nina-haugen",              teamId: BigInt(13), position: Position.Bakspiller,  jerseyNumber: BigInt(14), isActive: true, nationality: "NOR" },
  { id: BigInt(159), name: "Stine Thorstensen",        slug: "stine-thorstensen",        teamId: BigInt(13), position: Position.Linje,       jerseyNumber: BigInt(5),  isActive: true, nationality: "NOR" },
  { id: BigInt(160), name: "Maja Olsen",               slug: "maja-olsen",               teamId: BigInt(13), position: Position.Bakspiller,  jerseyNumber: BigInt(8),  isActive: true, nationality: "NOR" },
  { id: BigInt(161), name: "Hege Walberg",             slug: "hege-walberg",             teamId: BigInt(13), position: Position.VenstreKant, jerseyNumber: BigInt(17), isActive: true, nationality: "NOR" },
  { id: BigInt(162), name: "Tone Eriksen",             slug: "tone-eriksen",             teamId: BigInt(13), position: Position.HoyreKant,  jerseyNumber: BigInt(21), isActive: true, nationality: "NOR" },

  // ── Nærbø IL (id 14) ──
  { id: BigInt(163), name: "Elisabeth Bredvold",       slug: "elisabeth-bredvold",       teamId: BigInt(14), position: Position.Keeper,      jerseyNumber: BigInt(1),  isActive: true, nationality: "NOR" },
  { id: BigInt(164), name: "Astrid Vatne",             slug: "astrid-vatne",             teamId: BigInt(14), position: Position.Keeper,      jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(165), name: "Ragnhild Aarrestad",       slug: "ragnhild-aarrestad",       teamId: BigInt(14), position: Position.VenstreKant, jerseyNumber: BigInt(7),  isActive: true, nationality: "NOR" },
  { id: BigInt(166), name: "Sissel Haraldstad",        slug: "sissel-haraldstad",        teamId: BigInt(14), position: Position.HoyreKant,  jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(167), name: "Gunhild Kristiansen",      slug: "gunhild-kristiansen",      teamId: BigInt(14), position: Position.Linje,       jerseyNumber: BigInt(4),  isActive: true, nationality: "NOR" },
  { id: BigInt(168), name: "Randi Nygaard",            slug: "randi-nygaard",            teamId: BigInt(14), position: Position.Bakspiller,  jerseyNumber: BigInt(6),  isActive: true, nationality: "NOR" },
  { id: BigInt(169), name: "Camilla Breivik",          slug: "camilla-breivik",          teamId: BigInt(14), position: Position.Bakspiller,  jerseyNumber: BigInt(9),  isActive: true, nationality: "NOR" },
  { id: BigInt(170), name: "Line Salvesen",            slug: "line-salvesen",            teamId: BigInt(14), position: Position.HoyreKant,  jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(171), name: "Silje Vatland",            slug: "silje-vatland",            teamId: BigInt(14), position: Position.VenstreKant, jerseyNumber: BigInt(3),  isActive: true, nationality: "NOR" },
  { id: BigInt(172), name: "Marte Aasen",              slug: "marte-aasen",              teamId: BigInt(14), position: Position.Bakspiller,  jerseyNumber: BigInt(14), isActive: true, nationality: "NOR" },
  { id: BigInt(173), name: "Kristin Jøssang",          slug: "kristin-jossang",          teamId: BigInt(14), position: Position.Linje,       jerseyNumber: BigInt(5),  isActive: true, nationality: "NOR" },
  { id: BigInt(174), name: "Hege Nordbø",              slug: "hege-nordbo",              teamId: BigInt(14), position: Position.Bakspiller,  jerseyNumber: BigInt(8),  isActive: true, nationality: "NOR" },
  { id: BigInt(175), name: "Ingrid Ree",               slug: "ingrid-ree",               teamId: BigInt(14), position: Position.VenstreKant, jerseyNumber: BigInt(17), isActive: true, nationality: "NOR" },
  { id: BigInt(176), name: "Tone Undheim",             slug: "tone-undheim",             teamId: BigInt(14), position: Position.HoyreKant,  jerseyNumber: BigInt(21), isActive: true, nationality: "NOR" },
];

// Build a team name lookup for fast search
const teamNameById: Record<string, string> = {};
for (const t of teams) {
  teamNameById[t.id.toString()] = t.name.toLowerCase();
}

const followedPlayers: Player[] = [players[0], players[4], players[14]]; // Silje Solberg, Nora Mørk, Heidi Løke

const matches: Match[] = [
  { id: BigInt(1),  homeTeamId: BigInt(1), awayTeamId: BigInt(2),  startTime: now - oneDay * BigInt(70), status: MatchStatus.Finished, competition: "REMA 1000-ligaen", venue: "Sola Idrettshall" },
  { id: BigInt(2),  homeTeamId: BigInt(3), awayTeamId: BigInt(4),  startTime: now - oneDay * BigInt(63), status: MatchStatus.Finished, competition: "REMA 1000-ligaen", venue: "Hamar Idrettshall" },
  { id: BigInt(3),  homeTeamId: BigInt(5), awayTeamId: BigInt(6),  startTime: now - oneDay * BigInt(63), status: MatchStatus.Finished, competition: "REMA 1000-ligaen", venue: "Tertnes Arena" },
  { id: BigInt(4),  homeTeamId: BigInt(7), awayTeamId: BigInt(8),  startTime: now - oneDay * BigInt(63), status: MatchStatus.Finished, competition: "REMA 1000-ligaen", venue: "Fjellhammer Hallen" },
  { id: BigInt(5),  homeTeamId: BigInt(2), awayTeamId: BigInt(3),  startTime: now - oneDay * BigInt(56), status: MatchStatus.Finished, competition: "REMA 1000-ligaen", venue: "Larvik Arena" },
  { id: BigInt(6),  homeTeamId: BigInt(4), awayTeamId: BigInt(1),  startTime: now - oneDay * BigInt(56), status: MatchStatus.Finished, competition: "REMA 1000-ligaen", venue: "Molde Arena" },
  { id: BigInt(7),  homeTeamId: BigInt(6), awayTeamId: BigInt(5),  startTime: now - oneDay * BigInt(49), status: MatchStatus.Finished, competition: "REMA 1000-ligaen", venue: "Fana Hallen" },
  { id: BigInt(8),  homeTeamId: BigInt(8), awayTeamId: BigInt(7),  startTime: now - oneDay * BigInt(49), status: MatchStatus.Finished, competition: "REMA 1000-ligaen", venue: "Byåsen Hallen" },
  { id: BigInt(9),  homeTeamId: BigInt(1), awayTeamId: BigInt(3),  startTime: now - oneDay * BigInt(49), status: MatchStatus.Finished, competition: "REMA 1000-ligaen", venue: "Sola Idrettshall" },
  { id: BigInt(10), homeTeamId: BigInt(2), awayTeamId: BigInt(4),  startTime: now - oneDay * BigInt(42), status: MatchStatus.Finished, competition: "REMA 1000-ligaen", venue: "Larvik Arena" },
  { id: BigInt(12), homeTeamId: BigInt(7), awayTeamId: BigInt(6),  startTime: now - oneDay * BigInt(42), status: MatchStatus.Finished, competition: "REMA 1000-ligaen", venue: "Fjellhammer Hallen" },
  { id: BigInt(18), homeTeamId: BigInt(7), awayTeamId: BigInt(2),  startTime: now - oneDay * BigInt(28), status: MatchStatus.Finished, competition: "REMA 1000-ligaen", venue: "Fjellhammer Hallen" },
  { id: BigInt(21), homeTeamId: BigInt(5), awayTeamId: BigInt(4),  startTime: now + oneDay * BigInt(4),  status: MatchStatus.Upcoming, competition: "REMA 1000-ligaen", venue: "Tertnes Arena" },
  { id: BigInt(22), homeTeamId: BigInt(6), awayTeamId: BigInt(3),  startTime: now + oneDay * BigInt(4),  status: MatchStatus.Upcoming, competition: "REMA 1000-ligaen", venue: "Fana Hallen" },
  { id: BigInt(23), homeTeamId: BigInt(7), awayTeamId: BigInt(1),  startTime: now + oneDay * BigInt(7),  status: MatchStatus.Upcoming, competition: "REMA 1000-ligaen", venue: "Fjellhammer Hallen" },
  { id: BigInt(24), homeTeamId: BigInt(8), awayTeamId: BigInt(2),  startTime: now + oneDay * BigInt(7),  status: MatchStatus.Upcoming, competition: "REMA 1000-ligaen", venue: "Byåsen Hallen" },
  { id: BigInt(25), homeTeamId: BigInt(1), awayTeamId: BigInt(6),  startTime: now + oneDay * BigInt(11), status: MatchStatus.Upcoming, competition: "REMA 1000-ligaen", venue: "Sola Idrettshall" },
  { id: BigInt(26), homeTeamId: BigInt(2), awayTeamId: BigInt(7),  startTime: now + oneDay * BigInt(11), status: MatchStatus.Upcoming, competition: "REMA 1000-ligaen", venue: "Larvik Arena" },
];

// Opponent names for display in feed
export const matchOpponents: Record<string, string> = {
  "1-1": "Larvik HK",       "1-2": "Sola HK",
  "4-7": "Byåsen Elite",    "4-8": "Fjellhammer HK",
  "5-2": "Storhamar Elite", "5-3": "Larvik HK",
  "8-8": "Fjellhammer HK",  "8-7": "Byåsen Elite",
  "12-7": "Fana HK",        "12-6": "Fjellhammer HK",
  "18-7": "Larvik HK",      "18-2": "Fjellhammer HK",
  "23-7": "Sola HK",        "23-1": "Fjellhammer HK",
  "26-2": "Fjellhammer HK", "26-7": "Larvik HK",
};

// Player match stats — key players including Linnea Aula (id 61)
const playerMatchStats: PlayerMatchStats[] = [
  // Nora Mørk (id 5, Sola) — 3 matches
  { id: BigInt(1),  playerId: BigInt(5),  matchId: BigInt(1),  minutesPlayed: BigInt(50), goals: BigInt(7),  shots: BigInt(11), shotPct: 63.6, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(2) },
  { id: BigInt(2),  playerId: BigInt(5),  matchId: BigInt(9),  minutesPlayed: BigInt(55), goals: BigInt(5),  shots: BigInt(9),  shotPct: 55.6, yellowCards: BigInt(1), twoMinSuspensions: BigInt(0), assists: BigInt(1) },
  { id: BigInt(3),  playerId: BigInt(5),  matchId: BigInt(6),  minutesPlayed: BigInt(52), goals: BigInt(8),  shots: BigInt(13), shotPct: 61.5, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(3) },
  // Heidi Løke (id 15, Larvik) — 3 matches
  { id: BigInt(4),  playerId: BigInt(15), matchId: BigInt(1),  minutesPlayed: BigInt(50), goals: BigInt(4),  shots: BigInt(7),  shotPct: 57.1, yellowCards: BigInt(0), twoMinSuspensions: BigInt(1), assists: BigInt(1) },
  { id: BigInt(5),  playerId: BigInt(15), matchId: BigInt(5),  minutesPlayed: BigInt(45), goals: BigInt(6),  shots: BigInt(9),  shotPct: 66.7, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(2) },
  { id: BigInt(6),  playerId: BigInt(15), matchId: BigInt(18), minutesPlayed: BigInt(55), goals: BigInt(2),  shots: BigInt(5),  shotPct: 40.0, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(1) },
  // Silje Solberg (id 1, Sola) — keeper
  { id: BigInt(7),  playerId: BigInt(1),  matchId: BigInt(1),  minutesPlayed: BigInt(60), saves: BigInt(14), savePct: 56.0, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0) },
  { id: BigInt(8),  playerId: BigInt(1),  matchId: BigInt(9),  minutesPlayed: BigInt(60), saves: BigInt(11), savePct: 50.0, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0) },
  // Linnea Isabel Ingeborg Aula (id 61, Fjellhammer) — 5 matches
  { id: BigInt(10), playerId: BigInt(61), matchId: BigInt(4),  minutesPlayed: BigInt(60), goals: BigInt(4),  shots: BigInt(7),  shotPct: 57.1, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(2) },
  { id: BigInt(11), playerId: BigInt(61), matchId: BigInt(8),  minutesPlayed: BigInt(60), goals: BigInt(5),  shots: BigInt(8),  shotPct: 62.5, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(3) },
  { id: BigInt(12), playerId: BigInt(61), matchId: BigInt(12), minutesPlayed: BigInt(60), goals: BigInt(6),  shots: BigInt(9),  shotPct: 66.7, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(3) },
  { id: BigInt(13), playerId: BigInt(61), matchId: BigInt(18), minutesPlayed: BigInt(60), goals: BigInt(5),  shots: BigInt(8),  shotPct: 62.5, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(2) },
  // Martine Tveter (id 64, Fjellhammer) — 3 matches
  { id: BigInt(20), playerId: BigInt(64), matchId: BigInt(4),  minutesPlayed: BigInt(60), goals: BigInt(5),  shots: BigInt(8),  shotPct: 62.5, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(2) },
  { id: BigInt(21), playerId: BigInt(64), matchId: BigInt(8),  minutesPlayed: BigInt(55), goals: BigInt(4),  shots: BigInt(7),  shotPct: 57.1, yellowCards: BigInt(0), twoMinSuspensions: BigInt(1), assists: BigInt(2) },
  { id: BigInt(22), playerId: BigInt(64), matchId: BigInt(12), minutesPlayed: BigInt(60), goals: BigInt(5),  shots: BigInt(8),  shotPct: 62.5, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(2) },
  // Ida Wall Bakken (id 63, Fjellhammer) — keeper
  { id: BigInt(30), playerId: BigInt(63), matchId: BigInt(4),  minutesPlayed: BigInt(60), saves: BigInt(10), savePct: 41.7, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0) },
  { id: BigInt(31), playerId: BigInt(63), matchId: BigInt(8),  minutesPlayed: BigInt(60), saves: BigInt(11), savePct: 40.7, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0) },
  { id: BigInt(32), playerId: BigInt(63), matchId: BigInt(12), minutesPlayed: BigInt(60), saves: BigInt(11), savePct: 42.3, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0) },
  // ── Demo players ──
  // Camilla Herrem (id 3, Sola) — 4 matches
  { id: BigInt(40), playerId: BigInt(3),  matchId: BigInt(1),  minutesPlayed: BigInt(60), goals: BigInt(5), shots: BigInt(9),  shotPct: 55.6, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(3) },
  { id: BigInt(41), playerId: BigInt(3),  matchId: BigInt(6),  minutesPlayed: BigInt(60), goals: BigInt(6), shots: BigInt(10), shotPct: 60.0, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(4) },
  { id: BigInt(42), playerId: BigInt(3),  matchId: BigInt(9),  minutesPlayed: BigInt(55), goals: BigInt(4), shots: BigInt(8),  shotPct: 50.0, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(2) },
  // Ida Alstad (id 14, Byåsen) — 4 matches
  { id: BigInt(50), playerId: BigInt(14), matchId: BigInt(4),  minutesPlayed: BigInt(58), goals: BigInt(4), shots: BigInt(7),  shotPct: 57.1, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(2) },
  { id: BigInt(51), playerId: BigInt(14), matchId: BigInt(8),  minutesPlayed: BigInt(55), goals: BigInt(5), shots: BigInt(9),  shotPct: 55.6, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(2) },
  { id: BigInt(52), playerId: BigInt(14), matchId: BigInt(10), minutesPlayed: BigInt(60), goals: BigInt(6), shots: BigInt(10), shotPct: 60.0, yellowCards: BigInt(1), twoMinSuspensions: BigInt(0), assists: BigInt(3) },
  // Sarah Deari Solheim (id 68, Fjellhammer) — 4 matches
  { id: BigInt(60), playerId: BigInt(68), matchId: BigInt(4),  minutesPlayed: BigInt(60), goals: BigInt(7), shots: BigInt(11), shotPct: 63.6, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(3) },
  { id: BigInt(61), playerId: BigInt(68), matchId: BigInt(8),  minutesPlayed: BigInt(58), goals: BigInt(6), shots: BigInt(10), shotPct: 60.0, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(2) },
  { id: BigInt(62), playerId: BigInt(68), matchId: BigInt(12), minutesPlayed: BigInt(60), goals: BigInt(9), shots: BigInt(13), shotPct: 69.2, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(4) },
  { id: BigInt(63), playerId: BigInt(68), matchId: BigInt(18), minutesPlayed: BigInt(58), goals: BigInt(8), shots: BigInt(12), shotPct: 66.7, yellowCards: BigInt(0), twoMinSuspensions: BigInt(0), assists: BigInt(3) },
];

// Season stats for key players
const playerSeasonStats: Record<string, PlayerSeasonStats> = {
  // Sola
  "1":  { id: BigInt(1),  playerId: BigInt(1),  season: "2025-26", matchesPlayed: BigInt(18), totalMinutes: BigInt(1080), totalSaves: BigInt(98),  totalYellowCards: BigInt(0), totalTwoMin: BigInt(0),  totalRedCards: BigInt(0) },
  "3":  { id: BigInt(3),  playerId: BigInt(3),  season: "2025-26", matchesPlayed: BigInt(20), totalMinutes: BigInt(1050), totalGoals: BigInt(78),  totalShots: BigInt(130), totalYellowCards: BigInt(0), totalTwoMin: BigInt(0), totalAssists: BigInt(32), totalRedCards: BigInt(0), shootingPercent: 60.0 },
  "5":  { id: BigInt(5),  playerId: BigInt(5),  season: "2025-26", matchesPlayed: BigInt(16), totalMinutes: BigInt(820),  totalGoals: BigInt(72),  totalShots: BigInt(130), totalYellowCards: BigInt(2), totalTwoMin: BigInt(1), totalAssists: BigInt(19), totalRedCards: BigInt(0) },
  "6":  { id: BigInt(6),  playerId: BigInt(6),  season: "2025-26", matchesPlayed: BigInt(17), totalMinutes: BigInt(900),  totalGoals: BigInt(65),  totalShots: BigInt(118), totalYellowCards: BigInt(1), totalTwoMin: BigInt(2), totalAssists: BigInt(24), totalRedCards: BigInt(0) },
  // Larvik → Byåsen: Ida Alstad (id 14)
  "14": { id: BigInt(14), playerId: BigInt(14), season: "2025-26", matchesPlayed: BigInt(19), totalMinutes: BigInt(940),  totalGoals: BigInt(64),  totalShots: BigInt(108), totalYellowCards: BigInt(1), totalTwoMin: BigInt(0), totalAssists: BigInt(28), totalRedCards: BigInt(0), shootingPercent: 59.3 },
  "15": { id: BigInt(15), playerId: BigInt(15), season: "2025-26", matchesPlayed: BigInt(16), totalMinutes: BigInt(780),  totalGoals: BigInt(48),  totalShots: BigInt(82),  totalYellowCards: BigInt(0), totalTwoMin: BigInt(3), totalAssists: BigInt(12), totalRedCards: BigInt(0) },
  "16": { id: BigInt(16), playerId: BigInt(16), season: "2025-26", matchesPlayed: BigInt(17), totalMinutes: BigInt(880),  totalGoals: BigInt(82),  totalShots: BigInt(140), totalYellowCards: BigInt(1), totalTwoMin: BigInt(1), totalAssists: BigInt(28), totalRedCards: BigInt(0) },
  // Storhamar
  "26": { id: BigInt(26), playerId: BigInt(26), season: "2025-26", matchesPlayed: BigInt(17), totalMinutes: BigInt(870),  totalGoals: BigInt(68),  totalShots: BigInt(118), totalYellowCards: BigInt(0), totalTwoMin: BigInt(1), totalAssists: BigInt(18), totalRedCards: BigInt(0) },
  // Fjellhammer
  "61": { id: BigInt(61), playerId: BigInt(61), season: "2025-26", matchesPlayed: BigInt(15), totalMinutes: BigInt(780),  totalGoals: BigInt(55),  totalShots: BigInt(92),  totalYellowCards: BigInt(1), totalTwoMin: BigInt(0), totalAssists: BigInt(18), totalRedCards: BigInt(0) },
  "62": { id: BigInt(62), playerId: BigInt(62), season: "2025-26", matchesPlayed: BigInt(14), totalMinutes: BigInt(680),  totalGoals: BigInt(38),  totalShots: BigInt(72),  totalYellowCards: BigInt(2), totalTwoMin: BigInt(2), totalAssists: BigInt(9),  totalRedCards: BigInt(0) },
  "63": { id: BigInt(63), playerId: BigInt(63), season: "2025-26", matchesPlayed: BigInt(16), totalMinutes: BigInt(960),  totalSaves: BigInt(88),  totalYellowCards: BigInt(0), totalTwoMin: BigInt(0), totalRedCards: BigInt(0) },
  "64": { id: BigInt(64), playerId: BigInt(64), season: "2025-26", matchesPlayed: BigInt(15), totalMinutes: BigInt(760),  totalGoals: BigInt(52),  totalShots: BigInt(88),  totalYellowCards: BigInt(0), totalTwoMin: BigInt(2), totalAssists: BigInt(14), totalRedCards: BigInt(0) },
  // Sarah Deari Solheim (id 68) — toppscorer Fjellhammer
  "68": { id: BigInt(68), playerId: BigInt(68), season: "2025-26", matchesPlayed: BigInt(22), totalMinutes: BigInt(1180), totalGoals: BigInt(189), totalShots: BigInt(280), totalYellowCards: BigInt(1), totalTwoMin: BigInt(1), totalAssists: BigInt(54), totalRedCards: BigInt(0), shootingPercent: 67.5 },
  "65": { id: BigInt(65), playerId: BigInt(65), season: "2025-26", matchesPlayed: BigInt(13), totalMinutes: BigInt(600),  totalGoals: BigInt(32),  totalShots: BigInt(60),  totalYellowCards: BigInt(1), totalTwoMin: BigInt(1), totalAssists: BigInt(8),  totalRedCards: BigInt(0) },
};

// Feed events for followed players
const feedEvents: FeedEvent[] = [
  { id: BigInt(1),  userId: Principal.anonymous(), playerId: BigInt(5),  matchId: BigInt(1),  eventType: FeedEventType.GoalsScored,    title: "7 mål mot Larvik HK",        description: "Nora Mørk var ustoppelig med 7 mål og 2 assists i seieren mot Larvik.",         statValue: BigInt(7),  createdAt: now - oneDay },
  { id: BigInt(2),  userId: Principal.anonymous(), playerId: BigInt(5),  matchId: BigInt(1),  eventType: FeedEventType.MinutesPlayed,  title: "spilte 50 minutter",         description: "Spilte 50 av 60 minutter mot Larvik HK.",                                     statValue: BigInt(50), createdAt: now - oneDay },
  { id: BigInt(3),  userId: Principal.anonymous(), playerId: BigInt(15), matchId: BigInt(1),  eventType: FeedEventType.GoalsScored,    title: "4 mål mot Sola HK",          description: "Heidi Løke noterte seg for 4 mål og 1 assist i kampen mot Sola.",            statValue: BigInt(4),  createdAt: now - oneDay },
  { id: BigInt(4),  userId: Principal.anonymous(), playerId: BigInt(15), matchId: BigInt(1),  eventType: FeedEventType.TwoMinSuspension, title: "1 to-minutters utvisning", description: "Heidi Løke fikk én 2-minutters utvisning mot Sola.",                          statValue: BigInt(1),  createdAt: now - oneDay },
  { id: BigInt(5),  userId: Principal.anonymous(), playerId: BigInt(61), matchId: BigInt(12), eventType: FeedEventType.GoalsScored,    title: "6 mål mot Fana HK",          description: "Linnea Isabel Ingeborg Aula scoret 6 mål i en strålende prestasjon for Fjellhammer.", statValue: BigInt(6), createdAt: now - oneDay * BigInt(3) },
  { id: BigInt(6),  userId: Principal.anonymous(), playerId: BigInt(61), matchId: BigInt(8),  eventType: FeedEventType.GoalsScored,    title: "5 mål mot Byåsen Elite",     description: "Linnea Aula leverte 5 mål og 3 assists for Fjellhammer.",                    statValue: BigInt(5),  createdAt: now - oneDay * BigInt(6) },
  { id: BigInt(7),  userId: Principal.anonymous(), playerId: BigInt(5),  eventType: FeedEventType.SeasonAvgUpdated, title: "Sesongsnitt: 4.5 mål/kamp", description: "Nora Mørk økte snittet til 4.5 mål per kamp etter siste runde.",           createdAt: now - BigInt(3_600_000_000_000) },
  { id: BigInt(8),  userId: Principal.anonymous(), playerId: BigInt(1),  matchId: BigInt(1),  eventType: FeedEventType.MinutesPlayed,  title: "14 redninger mot Larvik",    description: "Silje Solberg holdt buret delvis rent med 14 redninger.",                    statValue: BigInt(14), createdAt: now - oneDay },
  // Demo: Ida Alstad (id 14, Byåsen)
  { id: BigInt(9),  userId: Principal.anonymous(), playerId: BigInt(14), matchId: BigInt(8),  eventType: FeedEventType.GoalsScored,    title: "5 mål mot Fjellhammer IL",   description: "Ida Alstad scoret 5 mål og hadde 2 assists i kampen mot Fjellhammer.",      statValue: BigInt(5),  createdAt: now - oneDay * BigInt(2) },
  { id: BigInt(10), userId: Principal.anonymous(), playerId: BigInt(14), matchId: BigInt(8),  eventType: FeedEventType.MinutesPlayed,  title: "Spilte 55 minutter",         description: "Ida Alstad spilte 55 av 60 minutter for Byåsen.",                            statValue: BigInt(55), createdAt: now - oneDay * BigInt(2) },
  // Demo: Sarah Deari Solheim (id 68, Fjellhammer)
  { id: BigInt(11), userId: Principal.anonymous(), playerId: BigInt(68), matchId: BigInt(18), eventType: FeedEventType.GoalsScored,    title: "8 mål mot Larvik HK",        description: "Sarah Solheim var ustoppelig med 8 mål og 3 assists for Fjellhammer.",     statValue: BigInt(8),  createdAt: now - oneDay * BigInt(2) },
  { id: BigInt(12), userId: Principal.anonymous(), playerId: BigInt(68), matchId: BigInt(18), eventType: FeedEventType.MinutesPlayed,  title: "Spilte 58 minutter",         description: "Sarah Solheim sto på banen store deler av kampen mot Larvik.",              statValue: BigInt(58), createdAt: now - oneDay * BigInt(2) },
  // Demo: Camilla Herrem (id 3, Sola)
  { id: BigInt(13), userId: Principal.anonymous(), playerId: BigInt(3),  matchId: BigInt(6),  eventType: FeedEventType.GoalsScored,    title: "6 mål mot Molde Elite",      description: "Camilla Herrem viste klassen sin med 6 mål og 4 assists for Sola HK.",    statValue: BigInt(6),  createdAt: now - oneDay * BigInt(3) },
  { id: BigInt(14), userId: Principal.anonymous(), playerId: BigInt(3),  matchId: BigInt(6),  eventType: FeedEventType.MinutesPlayed,  title: "Spilte 60 minutter",         description: "Camilla Herrem spilte hele kampen for Sola HK mot Molde Elite.",           statValue: BigInt(60), createdAt: now - oneDay * BigInt(3) },
];

let following = new Set<bigint>([BigInt(3), BigInt(14), BigInt(68)]);

export const mockBackend: backendInterface = {
  followPlayer: async (playerId: bigint) => { following.add(playerId); },
  unfollowPlayer: async (playerId: bigint) => { following.delete(playerId); },
  isFollowing: async (playerId: bigint) => following.has(playerId),
  getFollowedPlayers: async () => players.filter(p => following.has(p.id)),
  getFeedEvents: async () => feedEvents,
  getPlayers: async () => players,
  getPlayersByTeam: async (teamId: bigint) => players.filter(p => p.teamId === teamId),
  searchPlayers: async (term: string) => {
    const lower = term.toLowerCase();
    return players.filter(p => {
      if (p.name.toLowerCase().includes(lower)) return true;
      if (p.slug.toLowerCase().includes(lower)) return true;
      // Also match by team name/slug so "fjellhammer" finds all players on that team
      const teamName = teamNameById[p.teamId.toString()] ?? "";
      const team = teams.find(t => t.id === p.teamId);
      if (teamName.includes(lower)) return true;
      if (team && team.slug.toLowerCase().includes(lower)) return true;
      return false;
    });
  },
  getPlayer: async (id: bigint) => players.find(p => p.id === id) ?? null,
  getTeams: async () => teams,
  getTeam: async (id: bigint) => teams.find(t => t.id === id) ?? null,
  searchTeams: async (term: string) => {
    const lower = term.toLowerCase();
    return teams.filter(t => t.name.toLowerCase().includes(lower) || t.slug.toLowerCase().includes(lower));
  },
  getMatches: async () => matches,
  getUpcomingMatches: async () => matches.filter(m => m.status === MatchStatus.Upcoming),
  getNextMatchForTeam: async (teamId: bigint) =>
    matches.find(m => m.status === MatchStatus.Upcoming && (m.homeTeamId === teamId || m.awayTeamId === teamId)) ?? null,
  getPlayerMatchStats: async (playerId: bigint) => playerMatchStats.filter(s => s.playerId === playerId),
  getPlayerSeasonStats: async (playerId: bigint) => playerSeasonStats[playerId.toString()] ?? null,
  getAllPlayerSeasonStats: async () => Object.values(playerSeasonStats),
  getProfixioStatus: async () => ({ isLive: false, dataSource: "mock", message: "Mock-modus", liveStatsCount: BigInt(0) }),
  refreshFromProfixio: async () => "Mock-modus: ingen live data tilgjengelig",
  refreshPlayerStats: async () => "Mock-modus: ingen live statistikk tilgjengelig",
  getPlayerCount: async () => BigInt(players.length),
  getDataStatus: async () => ({
    playerCount: BigInt(players.length),
    teamCount: BigInt(teams.length),
    dataSource: "mock",
    liveStatsCount: BigInt(0),
    statsSource: "mock",
    playersWithStats: BigInt(players.length),
  }),
  initUserFollows: async () => {},
};
