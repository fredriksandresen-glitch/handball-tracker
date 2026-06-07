export type NationalTeamInfo = {
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  teamLabel: string;
  sourceUrl: string;
  verifiedAt: string;
};

const NATIONAL_TEAM_PLAYERS: Record<string, NationalTeamInfo> = {
  "22398210032285": {
    countryCode: "FI",
    countryName: "Finland",
    flagEmoji: "🇫🇮",
    teamLabel: "Finlands landslag",
    sourceUrl: "https://finnhandball.net/huippu-urheilu/maajoukkueet/naiset/",
    verifiedAt: "2026-06-07",
  },
};

export function getNationalTeamInfo(playerId: bigint | string) {
  return NATIONAL_TEAM_PLAYERS[playerId.toString()];
}
