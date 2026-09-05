import type { LeagueId, SeasonId } from "../data/seasons";
import { loadRuntimeConfig } from "./runtimeConfig";

type ComparisonReportRequest = {
  playerIds: string[];
  season: SeasonId;
  league: LeagueId;
};

function reportEndpoint(chatEndpoint: string) {
  const url = new URL(chatEndpoint, window.location.origin);
  url.pathname = "/v1/handball/reports/player-comparison.pdf";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function downloadFilename(response: Response, season: SeasonId) {
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? `handball-tracker-${season}-spillersammenligning.pdf`;
}

export async function downloadComparisonReport(
  request: ComparisonReportRequest,
) {
  const runtimeConfig = await loadRuntimeConfig();
  if (!runtimeConfig.aiChatUrl) {
    throw new Error("Rapporttjenesten er ikke konfigurert.");
  }

  const response = await fetch(reportEndpoint(runtimeConfig.aiChatUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(payload?.message ?? "Kunne ikke lage rapporten.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = downloadFilename(response, request.season);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
