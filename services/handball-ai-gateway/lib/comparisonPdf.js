const PDFDocument = require("pdfkit");
const fetch = require("node-fetch");
const sharp = require("sharp");

const DEFAULT_ASSET_ORIGIN =
  process.env.ICP_ASSET_ORIGIN ??
  "https://hrzvs-liaaa-aaaap-qusna-cai.icp0.io";

const COLORS = {
  ink: "#07132f",
  muted: "#5f6b7a",
  line: "#d8dee8",
  panel: "#f4f7fb",
  accent: "#efb51d",
  teal: "#0e8a83",
  white: "#ffffff",
};

function norwegianDate(value) {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "long",
    timeZone: "Europe/Oslo",
  }).format(new Date(value));
}

function leagueLabel(league) {
  return league === "first-division" ? "1. divisjon" : "Eliteserien";
}

function positionLabel(position) {
  return {
    Bakspiller: "Bakspiller",
    HoyreKant: "Høyre kant",
    Keeper: "Keeper",
    Linje: "Linjespiller",
    VenstreKant: "Venstre kant",
  }[position] ?? position;
}

function playerInitials(name) {
  return String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function fetchPlayerImage(
  imageUrl,
  {
    fetchImpl = fetch,
    assetOrigin = DEFAULT_ASSET_ORIGIN,
    timeoutMs = 12_000,
  } = {},
) {
  if (!imageUrl) return null;
  const url = new URL(imageUrl, assetOrigin).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) return null;
    const contentType = response.headers?.get?.("content-type") ?? "";
    if (contentType && !contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > 10_000_000) return null;
    return await sharp(buffer)
      .rotate()
      .resize({
        width: 600,
        height: 800,
        fit: "cover",
        position: "top",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
      .toBuffer();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadPlayerImages(report, options) {
  const entries = await Promise.all(
    report.players.map(async (player) => [
      player.playerId,
      await fetchPlayerImage(player.imageUrl, options),
    ]),
  );
  return new Map(entries);
}

function drawPlayerPortrait(doc, player, image, x, y, width, height) {
  doc.save();
  doc.roundedRect(x, y, width, height, 4).clip();
  if (image) {
    try {
      doc.image(image, x, y, {
        fit: [width, height],
        align: "center",
        valign: "top",
      });
      doc.restore();
      return;
    } catch {
      // Use the initials fallback when an image format cannot be decoded.
    }
  }
  doc.rect(x, y, width, height).fill(COLORS.ink);
  doc
    .font("Helvetica-Bold")
    .fontSize(Math.max(14, Math.min(width, height) * 0.28))
    .fillColor(COLORS.accent)
    .text(playerInitials(player.name), x, y + height / 2 - 10, {
      width,
      align: "center",
    });
  doc.restore();
}

function metricRows(player) {
  const metrics = player.metrics;
  const rows = [
    ["Kamper", metrics.games],
    ["Spilletid", metrics.totalPlayTime],
    ["Minutter per kamp", metrics.minutesPerGame],
    ["MEP totalt", metrics.mepTotal],
    ["MEP per kamp", metrics.mepPerGame],
    ["MEP per 60 min", metrics.mepPer60],
    ["Form siste fem", metrics.formLastFive],
    ["Mål", metrics.goals],
    [
      "Andel av lagets mål*",
      `${player.goalContribution.appearanceGoalShare}% (${player.goalContribution.playerGoals}/${player.goalContribution.teamGoalsInAppearances})`,
    ],
    ["Mål per 60 min", metrics.goalsPer60],
    ["Assist per 60 min", metrics.assistsPer60],
    ["Skuddprosent", `${metrics.shotPercentage}%`],
    ["Tekniske feil", metrics.technicalErrors],
    ["2-minuttere", metrics.suspensions],
    ["Lagplassering", player.standing ? `${player.standing.rank}.` : "-"],
  ];
  if (metrics.savePercentage !== null) {
    rows.push(["Redningsprosent", `${metrics.savePercentage}%`]);
  }
  return rows;
}

function addPageHeader(doc, report, pageNumber) {
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.ink)
    .text("HANDBALL TRACKER", 42, 28);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(`${report.season} | ${leagueLabel(report.league)}`, 340, 28, {
      width: 213,
      align: "right",
    });
  doc
    .moveTo(42, 45)
    .lineTo(553, 45)
    .lineWidth(0.7)
    .strokeColor(COLORS.line)
    .stroke();
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(COLORS.muted)
    .text(`Side ${pageNumber}`, 42, 790, {
      width: 511,
      align: "right",
      lineBreak: false,
    });
}

function page(doc, report, pageNumber) {
  if (pageNumber > 1) doc.addPage();
  addPageHeader(doc, report, pageNumber);
  return 64;
}

function sectionTitle(doc, title, y) {
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLORS.ink)
    .text(title, 42, y);
  doc
    .moveTo(42, y + 24)
    .lineTo(553, y + 24)
    .lineWidth(2)
    .strokeColor(COLORS.accent)
    .stroke();
  return y + 38;
}

function introPage(doc, report, playerImages) {
  let y = page(doc, report, 1);
  doc.rect(42, y, 511, 166).fill(COLORS.ink);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.accent)
    .text("DYBDERAPPORT", 64, y + 25);
  doc
    .font("Helvetica-Bold")
    .fontSize(25)
    .fillColor(COLORS.white)
    .text("Spillersammenligning", 64, y + 50, { width: 455 });
  doc
    .font("Helvetica")
    .fontSize(12)
    .fillColor("#dce4f0")
    .text(report.players.map((player) => player.name).join("  |  "), 64, y + 90, {
      width: 455,
    });
  doc
    .fontSize(9)
    .text(
      `${report.season} | ${leagueLabel(report.league)} | Generert ${norwegianDate(report.generatedAt)}`,
      64,
      y + 132,
      { width: 455 },
    );

  y += 194;
  y = sectionTitle(doc, "Kort konklusjon", y);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.ink)
    .text(report.comparison.verdict, 42, y, { width: 511, lineGap: 3 });
  y += 54;

  const compactCards = report.players.length > 2;
  const cardWidth = compactCards ? 122 : 250;
  report.players.forEach((player, index) => {
    const x = 42 + index * (cardWidth + 8);
    doc.roundedRect(x, y, cardWidth, 132, 5).fill(COLORS.panel);
    if (compactCards) {
      drawPlayerPortrait(
        doc,
        player,
        playerImages.get(player.playerId),
        x + 41,
        y + 8,
        40,
        48,
      );
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.ink)
        .text(player.name, x + 8, y + 62, {
          width: cardWidth - 16,
          height: 26,
          align: "center",
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor(COLORS.teal)
        .text(String(player.metrics.mepPerGame), x + 8, y + 94, {
          width: cardWidth - 16,
          align: "center",
        });
      doc
        .font("Helvetica")
        .fontSize(6)
        .fillColor(COLORS.muted)
        .text("MEP PER KAMP", x + 8, y + 113, {
          width: cardWidth - 16,
          align: "center",
        });
    } else {
      drawPlayerPortrait(
        doc,
        player,
        playerImages.get(player.playerId),
        x + 11,
        y + 11,
        70,
        110,
      );
      const textX = x + 94;
      const textWidth = cardWidth - 105;
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(COLORS.ink)
        .text(player.name, textX, y + 13, {
          width: textWidth,
          height: 31,
        });
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(COLORS.muted)
        .text(
          `${positionLabel(player.position)}\n${player.teams.join(" / ")}${player.standing ? ` | ${player.standing.rank}. plass` : ""}`,
          textX,
          y + 48,
          {
          width: textWidth,
          height: 30,
          },
        );
      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .fillColor(COLORS.teal)
        .text(String(player.metrics.mepPerGame), textX, y + 83);
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(COLORS.muted)
        .text(`MEP/KAMP | ${player.metrics.games} KAMPER`, textX, y + 107, {
          width: textWidth,
        });
    }
  });

  y += 157;
  y = sectionTitle(doc, "Hvem leder på hva?", y);
  report.comparison.leaders.forEach((leader, index) => {
    const rowY = y + index * 25;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(leader.label, 42, rowY, { width: 230 });
    doc
      .font("Helvetica-Bold")
      .fillColor(COLORS.ink)
      .text(`${leader.playerName} (${leader.value})`, 275, rowY, {
        width: 278,
        align: "right",
      });
  });
}

function comparisonTable(doc, report) {
  let y = page(doc, report, 2);
  y = sectionTitle(doc, "Nøkkeltall", y);
  const labels = metricRows(report.players[0]).map(([label]) => label);
  const left = 42;
  const labelWidth = 135;
  const playerWidth = (511 - labelWidth) / report.players.length;

  doc.rect(left, y, 511, 28).fill(COLORS.ink);
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(COLORS.white)
    .text("MÅLING", left + 8, y + 9, { width: labelWidth - 16 });
  report.players.forEach((player, index) => {
    doc.text(player.name, left + labelWidth + index * playerWidth + 5, y + 6, {
      width: playerWidth - 10,
      height: 20,
      align: "center",
    });
  });
  y += 28;
  const metricRowHeight = 21;
  labels.forEach((label, rowIndex) => {
    const rowY = y + rowIndex * metricRowHeight;
    if (rowIndex % 2 === 0) doc.rect(left, rowY, 511, metricRowHeight).fill(COLORS.panel);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(label, left + 8, rowY + 6, { width: labelWidth - 16 });
    report.players.forEach((player, index) => {
      const value = metricRows(player).find(([rowLabel]) => rowLabel === label)?.[1] ?? "-";
      doc
        .font("Helvetica-Bold")
        .fillColor(COLORS.ink)
        .text(String(value), left + labelWidth + index * playerWidth + 5, rowY + 6, {
          width: playerWidth - 10,
          align: "center",
        });
    });
  });

  y += labels.length * metricRowHeight + 16;
  y = sectionTitle(doc, "Mot snittet for samme posisjon", y);
  const percentileDefs = [
    ["mepPerGame", "MEP per kamp", "mepPerGame"],
    ["formLastFive", "Form siste fem", "formLastFive"],
    ["goalsPer60", "Mål per 60", "goalsPer60"],
    ["assistsPer60", "Assist per 60", "assistsPer60"],
    ["shotPercentage", "Skuddprosent", "shotPercentage"],
    ["consistency", "Stabilitet", "mepConsistency"],
  ];
  percentileDefs.forEach(([key, label, metricKey], index) => {
    const rowY = y + index * 27;
    doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text(label, 42, rowY + 5, { width: 92 });
    report.players.forEach((player, playerIndex) => {
      const x = 140 + playerIndex * ((413) / report.players.length);
      const width = 413 / report.players.length - 12;
      const value = player.percentiles[key];
      doc.roundedRect(x, rowY + 5, width, 8, 4).fill(COLORS.line);
      if (value !== null) {
        doc.roundedRect(x, rowY + 5, Math.max(2, width * value / 100), 8, 4).fill(COLORS.teal);
      }
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(COLORS.ink)
        .text(
          `${player.metrics[metricKey]} | snitt ${player.positionAverage[metricKey] ?? "-"} | p${value ?? "-"}`,
          x,
          rowY + 17,
          { width, align: "right" },
        );
    });
  });

  y += percentileDefs.length * 27 + 11;
  y = sectionTitle(doc, "Målbidrag i egne kamper", y);
  const maxShare = Math.max(
    5,
    Math.ceil(
      Math.max(
        ...report.players.map(
          (player) => player.goalContribution.appearanceGoalShare,
        ),
      ) / 5,
    ) * 5,
  );
  report.players.forEach((player, index) => {
    const rowY = y + index * 24;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(player.name, 42, rowY + 2, { width: 155 });
    doc.roundedRect(202, rowY + 3, 275, 9, 4).fill(COLORS.line);
    doc
      .roundedRect(
        202,
        rowY + 3,
        Math.max(
          3,
          275 * player.goalContribution.appearanceGoalShare / maxShare,
        ),
        9,
        4,
      )
      .fill(COLORS.accent);
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(COLORS.ink)
      .text(
        `${player.goalContribution.appearanceGoalShare}% (${player.goalContribution.playerGoals}/${player.goalContribution.teamGoalsInAppearances})`,
        484,
        rowY + 2,
        { width: 69, align: "right" },
      );
  });
}

function playerPage(doc, report, player, pageNumber, playerImages) {
  let y = page(doc, report, pageNumber);
  y = sectionTitle(doc, player.name, y);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(
      `${positionLabel(player.position)} | ${player.teams.join(" / ")} | ${player.metrics.games} registrerte kamper`,
      42,
      y,
    );
  y += 31;

  doc.roundedRect(42, y, 511, 118, 5).fill(COLORS.panel);
  drawPlayerPortrait(
    doc,
    player,
    playerImages.get(player.playerId),
    54,
    y + 9,
    72,
    100,
  );
  const highlights = [
    ["MEP/kamp", player.metrics.mepPerGame],
    ["Form siste 5", player.metrics.formLastFive],
    ["Mål/60", player.metrics.goalsPer60],
    ["Assist/60", player.metrics.assistsPer60],
  ];
  highlights.forEach(([label, value], index) => {
    const x = 148 + (index % 2) * 190;
    const valueY = y + 18 + Math.floor(index / 2) * 48;
    doc.font("Helvetica-Bold").fontSize(17).fillColor(COLORS.teal).text(String(value), x, valueY);
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.muted).text(label, x, valueY + 24);
  });
  y += 137;

  y = sectionTitle(doc, "Profil og styrker", y);
  const strengths = player.strengths.length > 0
    ? player.strengths
    : ["For lite sammenligningsgrunnlag til sikre persentiler"];
  strengths.forEach((strength, index) => {
    doc.circle(48, y + index * 22 + 5, 3).fill(COLORS.accent);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.ink).text(strength, 60, y + index * 22);
  });
  y += strengths.length * 22 + 18;

  y = sectionTitle(doc, "Formkurve - fem siste kamper", y);
  const matches = player.metrics.recentMatches;
  const chartX = 56;
  const chartY = y + 12;
  const chartWidth = 470;
  const chartHeight = 80;
  const values = matches.map((match) => match.mep);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = max - min || 1;
  doc.rect(chartX, chartY, chartWidth, chartHeight).fill("#fbfcfe");
  doc.moveTo(chartX, chartY + chartHeight).lineTo(chartX + chartWidth, chartY + chartHeight).strokeColor(COLORS.line).stroke();
  matches.forEach((match, index) => {
    const x = chartX + (matches.length === 1 ? chartWidth / 2 : index * chartWidth / (matches.length - 1));
    const pointY = chartY + chartHeight - ((match.mep - min) / range) * (chartHeight - 15) - 7;
    if (index > 0) {
      const previous = matches[index - 1];
      const px = chartX + (index - 1) * chartWidth / (matches.length - 1);
      const py = chartY + chartHeight - ((previous.mep - min) / range) * (chartHeight - 15) - 7;
      doc.moveTo(px, py).lineTo(x, pointY).lineWidth(2).strokeColor(COLORS.teal).stroke();
    }
    doc.circle(x, pointY, 4).fill(COLORS.accent);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.ink).text(String(match.mep), x - 15, pointY - 16, { width: 30, align: "center" });
    doc.font("Helvetica").fontSize(6).fillColor(COLORS.muted).text(match.opponent, x - 34, chartY + chartHeight + 7, { width: 68, align: "center" });
  });
  y = chartY + chartHeight + 42;

  y = sectionTitle(doc, "Beste registrerte kamp", y);
  const best = player.metrics.bestMatch;
  if (best) {
    const venue = best.homeAway === "home" ? "hjemme" : "borte";
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(COLORS.ink)
      .text(`${best.date}: ${venue} mot ${best.opponent}`, 42, y);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(
        `MEP ${best.mep} | ${best.goals} mål | ${best.assists} assist | ${best.shots} skudd | ${best.playTime} spilletid`,
        42,
        y + 22,
      );
  }
  y += 65;

  y = sectionTitle(doc, "Datagrunnlag", y);
  const standingText = player.standing
    ? `${player.standing.teamName} endte på ${player.standing.rank}. plass med ${player.standing.points} poeng og målforskjell ${player.standing.goalDifference}.`
    : "Sluttplassering var ikke tilgjengelig for dette laget i rapportgrunnlaget.";
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.ink)
    .text(
      `${player.peerSampleSize} spillere inngår i posisjonsutvalget. ${standingText} ` +
        `Spilleren scoret ${player.goalContribution.appearanceGoalShare}% av lagets registrerte mål i kampene hun deltok i (${player.goalContribution.playerGoals} av ${player.goalContribution.teamGoalsInAppearances}). ` +
        `Form er gjennomsnittlig MEP i de fem siste registrerte kampene.`,
      42,
      y,
      { width: 511, lineGap: 3 },
    );
}

function methodologyPage(doc, report, pageNumber) {
  let y = page(doc, report, pageNumber);
  y = sectionTitle(doc, "Metode, kilder og forbehold", y);
  const blocks = [
    ["Sammenligningsgrunnlag", report.methodology.percentiles],
    [
      "Lagkontekst og målbidrag",
      "Sluttplassering, poeng og målforskjell beskriver styrken på laget spilleren representerte. Målbidrag er spillerens andel av lagets registrerte mål i kampene hun selv deltok i. Lagstyrke brukes som kontekst, ikke til en kunstig korrigert score.",
    ],
    ["Form", `De ${report.methodology.formWindow} siste registrerte kampene i valgt sesong og liga.`],
    ["Stabilitet", report.methodology.consistency],
    ["Datakilder", report.sources.join(" ")],
  ];
  blocks.forEach(([title, text]) => {
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.ink).text(title, 42, y);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted).text(text, 42, y + 17, { width: 511, lineGap: 3 });
    y += title === "Lagkontekst og målbidrag" ? 88 : 64;
  });
  y = sectionTitle(doc, "Viktige forbehold", y);
  report.caveats.forEach((caveat, index) => {
    doc.circle(48, y + index * 42 + 6, 3).fill(COLORS.accent);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.ink).text(caveat, 60, y + index * 42, { width: 493, lineGap: 3 });
  });
  y += report.caveats.length * 42 + 30;
  doc.roundedRect(42, y, 511, 90, 5).fill(COLORS.ink);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.accent)
    .text("Tolkning", 58, y + 18);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.white)
    .text(
      "Rapporten er et beslutningsgrunnlag, ikke en fasit. Video, taktisk rolle, treningsdata og medisinsk status bør inngå før sportslige beslutninger tas.",
      58,
      y + 39,
      { width: 478, lineGap: 3 },
    );
}

async function createComparisonPdf(report, options = {}) {
  const playerImages = await loadPlayerImages(report, options);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 42, right: 42, bottom: 42, left: 42 },
      info: {
        Title: report.title,
        Author: "Handball Tracker",
        Subject: `Spillersammenligning ${report.season}`,
      },
      bufferPages: true,
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    introPage(doc, report, playerImages);
    comparisonTable(doc, report);
    report.players.forEach((player, index) =>
      playerPage(doc, report, player, index + 3, playerImages),
    );
    methodologyPage(doc, report, report.players.length + 3);
    doc.end();
  });
}

module.exports = { createComparisonPdf };
