import type { backendInterface, FeedEvent, Player, PlayerMatchStats, PlayerSeasonStats, Match, Team } from "../backend";
import { FeedEventType, MatchStatus, Position } from "../backend";
import { Principal } from "@icp-sdk/core/principal";

const now = BigInt(Date.now()) * BigInt(1_000_000);
const oneDay = BigInt(86_400_000_000_000);

// Teams mirror backend seed data exactly (same IDs, slugs, names) — all 14 REMA 1000-ligaen teams
const teams: Team[] = [
  { id: BigInt(1), name: "Sola", slug: "sola" },
  { id: BigInt(2), name: "Storhamar Elite", slug: "storhamar-elite" },
  { id: BigInt(3), name: "Molde Elite", slug: "molde-elite" },
  { id: BigInt(4), name: "Larvik", slug: "larvik" },
  { id: BigInt(5), name: "Tertnes Elite", slug: "tertnes-elite" },
  { id: BigInt(6), name: "Fana", slug: "fana" },
  { id: BigInt(7), name: "Byåsen Elite", slug: "byasen-elite" },
  { id: BigInt(8), name: "Fredrikstad", slug: "fredrikstad" },
  { id: BigInt(9), name: "Gjerpen Håndball", slug: "gjerpen-handball" },
  { id: BigInt(10), name: "Follo HK Damer", slug: "follo-hk-damer" },
  { id: BigInt(11), name: "Oppsal", slug: "oppsal" },
  { id: BigInt(12), name: "Fjellhammer", slug: "fjellhammer" },
  { id: BigInt(13), name: "Haslum Damer", slug: "haslum-damer" },
  { id: BigInt(14), name: "Romerike Ravens", slug: "romerike-ravens" },
];


// Players mirror backend seed data (IDs 1–92, same team assignments)
const players: Player[] = [
  { id: BigInt(1), name: "Ine Skartveit Bergsvik", slug: "ine-skartveit-bergsvik", teamId: BigInt(1), position: Position.Keeper, jerseyNumber: BigInt(1), isActive: true, nationality: "NOR" },
  { id: BigInt(2), name: "Frida Brandbu Andersen", slug: "frida-brandbu-andersen", teamId: BigInt(1), position: Position.Bakspiller, jerseyNumber: BigInt(3), isActive: true, nationality: "NOR" },
  { id: BigInt(3), name: "Malin Holta", slug: "malin-holta", teamId: BigInt(1), position: Position.VenstreKant, jerseyNumber: BigInt(5), isActive: true, nationality: "NOR" },
  { id: BigInt(4), name: "Selma Helén Henriksen", slug: "selma-helen-henriksen", teamId: BigInt(1), position: Position.Linje, jerseyNumber: BigInt(6), isActive: true, nationality: "NOR" },
  { id: BigInt(5), name: "Synne With", slug: "synne-with", teamId: BigInt(1), position: Position.HoyreKant, jerseyNumber: BigInt(7), isActive: true, nationality: "NOR" },
  { id: BigInt(6), name: "Kaja Horst Haugseng", slug: "kaja-horst-haugseng", teamId: BigInt(1), position: Position.Linje, jerseyNumber: BigInt(9), isActive: true, nationality: "NOR" },
  { id: BigInt(7), name: "Hanna Stormyr Ræstad", slug: "hanna-stormyr-raestad", teamId: BigInt(1), position: Position.HoyreKant, jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(8), name: "Rikke Marie Granlund", slug: "rikke-marie-granlund", teamId: BigInt(1), position: Position.Keeper, jerseyNumber: BigInt(12), isActive: true, nationality: "NOR" },
  { id: BigInt(9), name: "Ine Erlandsen Grimsrud", slug: "ine-erlandsen-grimsrud", teamId: BigInt(1), position: Position.HoyreKant, jerseyNumber: BigInt(14), isActive: true, nationality: "NOR" },
  { id: BigInt(10), name: "Maria Khan", slug: "maria-khan", teamId: BigInt(1), position: Position.HoyreKant, jerseyNumber: BigInt(15), isActive: true, nationality: "NOR" },
  { id: BigInt(11), name: "Hedda Eggen Granli", slug: "hedda-eggen-granli", teamId: BigInt(1), position: Position.Keeper, jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(12), name: "Kristiane Knutsen", slug: "kristiane-knutsen", teamId: BigInt(1), position: Position.Bakspiller, jerseyNumber: BigInt(17), isActive: true, nationality: "NOR" },
  { id: BigInt(13), name: "Dina Klungtveit Olufsen", slug: "dina-klungtveit-olufsen", teamId: BigInt(1), position: Position.HoyreKant, jerseyNumber: BigInt(21), isActive: true, nationality: "NOR" },
  { id: BigInt(14), name: "Pia Grønstad", slug: "pia-gronstad", teamId: BigInt(1), position: Position.HoyreKant, jerseyNumber: BigInt(22), isActive: true, nationality: "NOR" },
  { id: BigInt(15), name: "Vilde Refsland", slug: "vilde-refsland", teamId: BigInt(1), position: Position.VenstreKant, jerseyNumber: BigInt(23), isActive: true, nationality: "NOR" },
  { id: BigInt(16), name: "Elise Utsola", slug: "elise-utsola", teamId: BigInt(1), position: Position.Bakspiller, jerseyNumber: BigInt(23), isActive: true, nationality: "NOR" },
  { id: BigInt(17), name: "Martha Barka", slug: "martha-barka", teamId: BigInt(1), position: Position.HoyreKant, jerseyNumber: BigInt(24), isActive: true, nationality: "NOR" },
  { id: BigInt(18), name: "Merlinda Qorraj", slug: "merlinda-qorraj", teamId: BigInt(1), position: Position.VenstreKant, jerseyNumber: BigInt(25), isActive: true, nationality: "NOR" },
  { id: BigInt(19), name: "Thea Kristensen", slug: "thea-kristensen", teamId: BigInt(1), position: Position.VenstreKant, jerseyNumber: BigInt(29), isActive: true, nationality: "NOR" },
  { id: BigInt(20), name: "Sara Todireanu Thorsen", slug: "sara-todireanu-thorsen", teamId: BigInt(1), position: Position.Bakspiller, jerseyNumber: BigInt(31), isActive: true, nationality: "NOR" },
  { id: BigInt(21), name: "Melanie Mie Bak", slug: "melanie-mie-bak", teamId: BigInt(1), position: Position.VenstreKant, jerseyNumber: BigInt(39), isActive: true, nationality: "NOR" },
  { id: BigInt(22), name: "Hege Holgersen Danielsen", slug: "hege-holgersen-danielsen", teamId: BigInt(1), position: Position.Linje, jerseyNumber: BigInt(49), isActive: true, nationality: "NOR" },
  { id: BigInt(23), name: "Camilla Herrem", slug: "camilla-herrem", teamId: BigInt(1), position: Position.VenstreKant, jerseyNumber: BigInt(77), isActive: true, nationality: "NOR", imageUrl: "/assets/generated/camilla-herrem.dim_600x800.jpg" },
  { id: BigInt(24), name: "Malin Larsen Aune", slug: "malin-larsen-aune", teamId: BigInt(2), position: Position.HoyreKant, jerseyNumber: BigInt(6), isActive: true, nationality: "NOR" },
  { id: BigInt(25), name: "Ingeborg Storbæk Monné", slug: "ingeborg-storbaek-monne", teamId: BigInt(2), position: Position.VenstreKant, jerseyNumber: BigInt(7), isActive: true, nationality: "NOR" },
  { id: BigInt(26), name: "Mathilde Rivas-Toft", slug: "mathilde-rivas-toft", teamId: BigInt(2), position: Position.HoyreKant, jerseyNumber: BigInt(9), isActive: true, nationality: "NOR" },
  { id: BigInt(27), name: "Kristin Venn", slug: "kristin-venn", teamId: BigInt(2), position: Position.VenstreKant, jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(28), name: "Tonje Enkerud", slug: "tonje-enkerud", teamId: BigInt(2), position: Position.VenstreKant, jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(29), name: "Monika Høistad Bruce", slug: "monika-hoistad-bruce", teamId: BigInt(2), position: Position.Linje, jerseyNumber: BigInt(14), isActive: true, nationality: "NOR" },
  { id: BigInt(30), name: "Elise Skinnehaugen", slug: "elise-skinnehaugen", teamId: BigInt(2), position: Position.HoyreKant, jerseyNumber: BigInt(15), isActive: true, nationality: "NOR" },
  { id: BigInt(31), name: "Julie Victoria Nordevall", slug: "julie-victoria-nordevall", teamId: BigInt(2), position: Position.Keeper, jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(32), name: "Pernille Brandenborg", slug: "pernille-brandenborg", teamId: BigInt(2), position: Position.Linje, jerseyNumber: BigInt(18), isActive: true, nationality: "NOR" },
  { id: BigInt(33), name: "Celina Vatne", slug: "celina-vatne", teamId: BigInt(2), position: Position.VenstreKant, jerseyNumber: BigInt(19), isActive: true, nationality: "NOR" },
  { id: BigInt(34), name: "Nora Isabell Husom Nordstrand", slug: "nora-isabell-husom-nordstrand", teamId: BigInt(2), position: Position.HoyreKant, jerseyNumber: BigInt(20), isActive: true, nationality: "NOR" },
  { id: BigInt(35), name: "Anniken Obaidli", slug: "anniken-obaidli", teamId: BigInt(2), position: Position.Bakspiller, jerseyNumber: BigInt(25), isActive: true, nationality: "NOR" },
  { id: BigInt(36), name: "Ada Aalstad", slug: "ada-aalstad", teamId: BigInt(2), position: Position.Bakspiller, jerseyNumber: BigInt(29), isActive: true, nationality: "NOR" },
  { id: BigInt(37), name: "Eli Marie Raasok", slug: "eli-marie-raasok", teamId: BigInt(2), position: Position.Keeper, jerseyNumber: BigInt(30), isActive: true, nationality: "NOR" },
  { id: BigInt(38), name: "Kjerstin Boge Solås", slug: "kjerstin-boge-solas", teamId: BigInt(2), position: Position.VenstreKant, jerseyNumber: BigInt(31), isActive: true, nationality: "NOR" },
  { id: BigInt(39), name: "Sanne Løkka Hagen", slug: "sanne-lokka-hagen", teamId: BigInt(2), position: Position.HoyreKant, jerseyNumber: BigInt(33), isActive: true, nationality: "NOR" },
  { id: BigInt(40), name: "Oda Cathrine Lunne Mastad", slug: "oda-cathrine-lunne-mastad", teamId: BigInt(2), position: Position.Linje, jerseyNumber: BigInt(37), isActive: true, nationality: "NOR" },
  { id: BigInt(41), name: "June Cecilie Krogh", slug: "june-cecilie-krogh", teamId: BigInt(2), position: Position.Keeper, jerseyNumber: BigInt(55), isActive: true, nationality: "NOR" },
  { id: BigInt(42), name: "Veronika Kafka Malá", slug: "veronika-kafka-mal", teamId: BigInt(2), position: Position.VenstreKant, jerseyNumber: BigInt(67), isActive: true, nationality: "NOR" },
  { id: BigInt(43), name: "Eli Smørgrav Skogstrand", slug: "eli-smorgrav-skogstrand", teamId: BigInt(3), position: Position.Keeper, jerseyNumber: BigInt(1), isActive: true, nationality: "NOR" },
  { id: BigInt(44), name: "Mia Kristine Strand", slug: "mia-kristine-strand", teamId: BigInt(3), position: Position.HoyreKant, jerseyNumber: BigInt(2), isActive: true, nationality: "NOR" },
  { id: BigInt(45), name: "Johanne Halseth Nypan", slug: "johanne-halseth-nypan", teamId: BigInt(3), position: Position.HoyreKant, jerseyNumber: BigInt(7), isActive: true, nationality: "NOR" },
  { id: BigInt(46), name: "Runa Heimsjø Sand", slug: "runa-heimsjo-sand", teamId: BigInt(3), position: Position.VenstreKant, jerseyNumber: BigInt(9), isActive: true, nationality: "NOR" },
  { id: BigInt(47), name: "Lene Kristiansen Tveiten", slug: "lene-kristiansen-tveiten", teamId: BigInt(3), position: Position.Bakspiller, jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(48), name: "Fanny Alma Elovson", slug: "fanny-alma-elovson", teamId: BigInt(3), position: Position.VenstreKant, jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(49), name: "Henrikke Hauge Kjølholdt", slug: "henrikke-hauge-kjolholdt", teamId: BigInt(3), position: Position.HoyreKant, jerseyNumber: BigInt(15), isActive: true, nationality: "NOR" },
  { id: BigInt(50), name: "Torine Hjelme Dalen", slug: "torine-hjelme-dalen", teamId: BigInt(3), position: Position.VenstreKant, jerseyNumber: BigInt(18), isActive: true, nationality: "NOR" },
  { id: BigInt(51), name: "Maja Sofie Muri", slug: "maja-sofie-muri", teamId: BigInt(3), position: Position.Linje, jerseyNumber: BigInt(20), isActive: true, nationality: "NOR" },
  { id: BigInt(52), name: "Lise Slemmen Gussiås", slug: "lise-slemmen-gussias", teamId: BigInt(3), position: Position.Keeper, jerseyNumber: BigInt(24), isActive: true, nationality: "NOR" },
  { id: BigInt(53), name: "Tonje Løseth", slug: "tonje-loseth", teamId: BigInt(3), position: Position.VenstreKant, jerseyNumber: BigInt(25), isActive: true, nationality: "NOR" },
  { id: BigInt(54), name: "Kaja Røhne", slug: "kaja-rohne", teamId: BigInt(3), position: Position.Linje, jerseyNumber: BigInt(26), isActive: true, nationality: "NOR" },
  { id: BigInt(55), name: "Julia Hessen", slug: "julia-hessen", teamId: BigInt(3), position: Position.Bakspiller, jerseyNumber: BigInt(30), isActive: true, nationality: "NOR" },
  { id: BigInt(56), name: "Julie Bøe Jacobsen", slug: "julie-boe-jacobsen", teamId: BigInt(3), position: Position.Bakspiller, jerseyNumber: BigInt(33), isActive: true, nationality: "NOR" },
  { id: BigInt(57), name: "Yazmin Yamundow Marie Ceesay", slug: "yazmin-yamundow-marie-ceesay", teamId: BigInt(3), position: Position.HoyreKant, jerseyNumber: BigInt(34), isActive: true, nationality: "NOR" },
  { id: BigInt(58), name: "Ingeborg Johanne Nyborg Tømmervåg", slug: "ingeborg-johanne-nyborg-tommervag", teamId: BigInt(3), position: Position.Linje, jerseyNumber: BigInt(39), isActive: true, nationality: "NOR" },
  { id: BigInt(59), name: "Jenny Carlsson", slug: "jenny-carlsson", teamId: BigInt(3), position: Position.VenstreKant, jerseyNumber: BigInt(42), isActive: true, nationality: "NOR" },
  { id: BigInt(60), name: "Susanne Liberg Amundsen", slug: "susanne-liberg-amundsen", teamId: BigInt(3), position: Position.VenstreKant, jerseyNumber: BigInt(44), isActive: true, nationality: "NOR" },
  { id: BigInt(61), name: "Liv Annik Drechsler", slug: "liv-annik-drechsler", teamId: BigInt(3), position: Position.Linje, jerseyNumber: BigInt(49), isActive: true, nationality: "NOR" },
  { id: BigInt(62), name: "Sakura Hauge", slug: "sakura-hauge", teamId: BigInt(3), position: Position.Keeper, jerseyNumber: BigInt(87), isActive: true, nationality: "NOR" },
  { id: BigInt(63), name: "Olivia Lykke Nygaard", slug: "olivia-lykke-nygaard", teamId: BigInt(4), position: Position.Keeper, jerseyNumber: BigInt(1), isActive: true, nationality: "NOR" },
  { id: BigInt(64), name: "Mari Kirkeby Stensrud", slug: "mari-kirkeby-stensrud", teamId: BigInt(4), position: Position.VenstreKant, jerseyNumber: BigInt(3), isActive: true, nationality: "NOR" },
  { id: BigInt(65), name: "Charlotte Koffeld Iversen", slug: "charlotte-koffeld-iversen", teamId: BigInt(4), position: Position.HoyreKant, jerseyNumber: BigInt(4), isActive: true, nationality: "NOR" },
  { id: BigInt(66), name: "Kine Hauge Kvalsund", slug: "kine-hauge-kvalsund", teamId: BigInt(4), position: Position.VenstreKant, jerseyNumber: BigInt(5), isActive: true, nationality: "NOR" },
  { id: BigInt(67), name: "Constance Hedenstad", slug: "constance-hedenstad", teamId: BigInt(4), position: Position.HoyreKant, jerseyNumber: BigInt(6), isActive: true, nationality: "NOR" },
  { id: BigInt(68), name: "Sara Berg", slug: "sara-berg", teamId: BigInt(4), position: Position.VenstreKant, jerseyNumber: BigInt(7), isActive: true, nationality: "NOR" },
  { id: BigInt(69), name: "Martine Wolff", slug: "martine-wolff", teamId: BigInt(4), position: Position.Linje, jerseyNumber: BigInt(8), isActive: true, nationality: "NOR" },
  { id: BigInt(70), name: "Julie Hulleberg", slug: "julie-hulleberg", teamId: BigInt(4), position: Position.VenstreKant, jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(71), name: "Frøydis Wiik Seierstad", slug: "froydis-wiik-seierstad", teamId: BigInt(4), position: Position.Bakspiller, jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(72), name: "Dina Frisendal", slug: "dina-frisendal", teamId: BigInt(4), position: Position.Keeper, jerseyNumber: BigInt(12), isActive: true, nationality: "NOR" },
  { id: BigInt(73), name: "Guro Ramberg", slug: "guro-ramberg", teamId: BigInt(4), position: Position.HoyreKant, jerseyNumber: BigInt(15), isActive: true, nationality: "NOR" },
  { id: BigInt(74), name: "Lea Løkke-Øwre", slug: "lea-lokke-owre", teamId: BigInt(4), position: Position.Keeper, jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(75), name: "Tuva Engh Auby", slug: "tuva-engh-auby", teamId: BigInt(4), position: Position.Keeper, jerseyNumber: BigInt(17), isActive: true, nationality: "NOR" },
  { id: BigInt(76), name: "Tirill Alexandrine Solumsmoen Mørch", slug: "tirill-alexandrine-solumsmoen-morch", teamId: BigInt(4), position: Position.Linje, jerseyNumber: BigInt(18), isActive: true, nationality: "NOR" },
  { id: BigInt(77), name: "Ingrid Vinjevoll", slug: "ingrid-vinjevoll", teamId: BigInt(4), position: Position.VenstreKant, jerseyNumber: BigInt(20), isActive: true, nationality: "NOR" },
  { id: BigInt(78), name: "Andrea Rønning", slug: "andrea-ronning", teamId: BigInt(4), position: Position.Bakspiller, jerseyNumber: BigInt(22), isActive: true, nationality: "NOR" },
  { id: BigInt(79), name: "Christine Neumann Strøm", slug: "christine-neumann-strom", teamId: BigInt(4), position: Position.Keeper, jerseyNumber: BigInt(23), isActive: true, nationality: "NOR" },
  { id: BigInt(80), name: "Amanda Maria Kurtovic", slug: "amanda-maria-kurtovic", teamId: BigInt(4), position: Position.HoyreKant, jerseyNumber: BigInt(24), isActive: true, nationality: "NOR" },
  { id: BigInt(81), name: "Tiril Birgitte Rosenberg", slug: "tiril-birgitte-rosenberg", teamId: BigInt(4), position: Position.Linje, jerseyNumber: BigInt(25), isActive: true, nationality: "NOR" },
  { id: BigInt(82), name: "Maja Furu Sæteren", slug: "maja-furu-saeteren", teamId: BigInt(4), position: Position.VenstreKant, jerseyNumber: BigInt(26), isActive: true, nationality: "NOR" },
  { id: BigInt(83), name: "Signe Andreassen", slug: "signe-andreassen", teamId: BigInt(4), position: Position.Bakspiller, jerseyNumber: BigInt(29), isActive: true, nationality: "NOR" },
  { id: BigInt(84), name: "Sigrid Ellingsen", slug: "sigrid-ellingsen", teamId: BigInt(4), position: Position.Keeper, jerseyNumber: BigInt(30), isActive: true, nationality: "NOR" },
  { id: BigInt(85), name: "Sanna Langmo Wold", slug: "sanna-langmo-wold", teamId: BigInt(4), position: Position.Keeper, jerseyNumber: BigInt(30), isActive: true, nationality: "NOR" },
  { id: BigInt(86), name: "Nea Angelina Holand Frydenlund", slug: "nea-angelina-holand-frydenlund", teamId: BigInt(4), position: Position.VenstreKant, jerseyNumber: BigInt(32), isActive: true, nationality: "NOR" },
  { id: BigInt(87), name: "Amalie Gram", slug: "amalie-gram", teamId: BigInt(4), position: Position.Bakspiller, jerseyNumber: BigInt(33), isActive: true, nationality: "NOR" },
  { id: BigInt(88), name: "Sarah Römhild", slug: "sarah-romhild", teamId: BigInt(4), position: Position.Bakspiller, jerseyNumber: BigInt(33), isActive: true, nationality: "NOR" },
  { id: BigInt(89), name: "Christina Pedersen", slug: "christina-pedersen", teamId: BigInt(4), position: Position.Bakspiller, jerseyNumber: BigInt(66), isActive: true, nationality: "NOR" },
  { id: BigInt(90), name: "Birgitte Karlsen Hagen", slug: "birgitte-karlsen-hagen", teamId: BigInt(5), position: Position.VenstreKant, jerseyNumber: BigInt(2), isActive: true, nationality: "NOR" },
  { id: BigInt(91), name: "Marthe Hatløy Walde", slug: "marthe-hatloy-walde", teamId: BigInt(5), position: Position.Linje, jerseyNumber: BigInt(4), isActive: true, nationality: "NOR" },
  { id: BigInt(92), name: "Avril Mikkelsen Frei", slug: "avril-mikkelsen-frei", teamId: BigInt(5), position: Position.Bakspiller, jerseyNumber: BigInt(7), isActive: true, nationality: "NOR" },
  { id: BigInt(93), name: "Stella Waagan Kruse", slug: "stella-waagan-kruse", teamId: BigInt(5), position: Position.VenstreKant, jerseyNumber: BigInt(8), isActive: true, nationality: "NOR" },
  { id: BigInt(94), name: "Henriette Espetvedt Eggen", slug: "henriette-espetvedt-eggen", teamId: BigInt(5), position: Position.VenstreKant, jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(95), name: "Sara Eline Lauritzen", slug: "sara-eline-lauritzen", teamId: BigInt(5), position: Position.VenstreKant, jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(96), name: "Emma Holtet", slug: "emma-holtet", teamId: BigInt(5), position: Position.Linje, jerseyNumber: BigInt(13), isActive: true, nationality: "NOR" },
  { id: BigInt(97), name: "Martine Hellesø Knutsen", slug: "martine-helleso-knutsen", teamId: BigInt(5), position: Position.VenstreKant, jerseyNumber: BigInt(15), isActive: true, nationality: "NOR" },
  { id: BigInt(98), name: "Helle Kjellberg-Line", slug: "helle-kjellberg-line", teamId: BigInt(5), position: Position.Keeper, jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
  { id: BigInt(99), name: "Rikke Midtfjeld", slug: "rikke-midtfjeld", teamId: BigInt(5), position: Position.HoyreKant, jerseyNumber: BigInt(18), isActive: true, nationality: "NOR" },
  { id: BigInt(100), name: "Vilde Janbu Fresvik", slug: "vilde-janbu-fresvik", teamId: BigInt(5), position: Position.HoyreKant, jerseyNumber: BigInt(19), isActive: true, nationality: "NOR" },
  { id: BigInt(101), name: "Fanny Skindlo", slug: "fanny-skindlo", teamId: BigInt(5), position: Position.Bakspiller, jerseyNumber: BigInt(20), isActive: true, nationality: "NOR" },
  { id: BigInt(102), name: "Maria Bergslien Gald", slug: "maria-bergslien-gald", teamId: BigInt(5), position: Position.VenstreKant, jerseyNumber: BigInt(22), isActive: true, nationality: "NOR" },
  { id: BigInt(103), name: "Viktoria Giske", slug: "viktoria-giske", teamId: BigInt(5), position: Position.Linje, jerseyNumber: BigInt(23), isActive: true, nationality: "NOR" },
  { id: BigInt(104), name: "Kadija Mårdalen", slug: "kadija-mardalen", teamId: BigInt(5), position: Position.Keeper, jerseyNumber: BigInt(24), isActive: true, nationality: "NOR" },
  { id: BigInt(105), name: "Marie Kristine Rokkones Hansen", slug: "marie-kristine-rokkones-hansen", teamId: BigInt(5), position: Position.HoyreKant, jerseyNumber: BigInt(26), isActive: true, nationality: "NOR" },
  { id: BigInt(106), name: "Nora Evelina Cecilia Rosenberg", slug: "nora-evelina-cecilia-rosenberg", teamId: BigInt(5), position: Position.VenstreKant, jerseyNumber: BigInt(28), isActive: true, nationality: "NOR" },
  { id: BigInt(107), name: "Benedikte Kalstad Hernes", slug: "benedikte-kalstad-hernes", teamId: BigInt(6), position: Position.Keeper, jerseyNumber: BigInt(1), isActive: true, nationality: "NOR" },
  { id: BigInt(108), name: "Emily Lønnestad-Wiers", slug: "emily-lonnestad-wiers", teamId: BigInt(6), position: Position.VenstreKant, jerseyNumber: BigInt(2), isActive: true, nationality: "NOR" },
  { id: BigInt(109), name: "Sara Hallingstad", slug: "sara-hallingstad", teamId: BigInt(6), position: Position.VenstreKant, jerseyNumber: BigInt(3), isActive: true, nationality: "NOR" },
  { id: BigInt(110), name: "Linnea Skadal Kyrkjeeide", slug: "linnea-skadal-kyrkjeeide", teamId: BigInt(6), position: Position.HoyreKant, jerseyNumber: BigInt(4), isActive: true, nationality: "NOR" },
  { id: BigInt(111), name: "Maren Eriksen Langø", slug: "maren-eriksen-lango", teamId: BigInt(6), position: Position.VenstreKant, jerseyNumber: BigInt(5), isActive: true, nationality: "NOR" },
  { id: BigInt(112), name: "Lina Waage Mossestad", slug: "lina-waage-mossestad", teamId: BigInt(6), position: Position.Bakspiller, jerseyNumber: BigInt(6), isActive: true, nationality: "NOR" },
  { id: BigInt(113), name: "Frida Aasekjær Wilkensen", slug: "frida-aasekjaer-wilkensen", teamId: BigInt(6), position: Position.HoyreKant, jerseyNumber: BigInt(9), isActive: true, nationality: "NOR" },
  { id: BigInt(114), name: "Christine Karlsen Alver", slug: "christine-karlsen-alver", teamId: BigInt(6), position: Position.Bakspiller, jerseyNumber: BigInt(10), isActive: true, nationality: "NOR" },
  { id: BigInt(115), name: "Anna Mortvedt", slug: "anna-mortvedt", teamId: BigInt(6), position: Position.Linje, jerseyNumber: BigInt(11), isActive: true, nationality: "NOR" },
  { id: BigInt(116), name: "Marie Skurtveit Davidsen", slug: "marie-skurtveit-davidsen", teamId: BigInt(6), position: Position.Keeper, jerseyNumber: BigInt(12), isActive: true, nationality: "NOR" },
  { id: BigInt(117), name: "Fride Heggdal Stølen", slug: "fride-heggdal-stolen", teamId: BigInt(6), position: Position.Linje, jerseyNumber: BigInt(13), isActive: true, nationality: "NOR" },
  { id: BigInt(118), name: "Eline Mangen Solbakken", slug: "eline-mangen-solbakken", teamId: BigInt(6), position: Position.Linje, jerseyNumber: BigInt(14), isActive: true, nationality: "NOR" },
  { id: BigInt(119), name: "Marie Mjøs", slug: "marie-mjos", teamId: BigInt(6), position: Position.Bakspiller, jerseyNumber: BigInt(15), isActive: true, nationality: "NOR" },
  { id: BigInt(120), name: "Leah Bjotveit Verpeide", slug: "leah-bjotveit-verpeide", teamId: BigInt(6), position: Position.Keeper, jerseyNumber: BigInt(16), isActive: true, nationality: "NOR" },
];


// Build a team name lookup for fast search
const teamNameById: Record<string, string> = {};
for (const t of teams) {
  teamNameById[t.id.toString()] = t.name.toLowerCase();
}

const followedPlayers: Player[] = [players[0], players[4], players[14]]; // First few players // Silje Solberg, Nora Mørk, Heidi Løke

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
