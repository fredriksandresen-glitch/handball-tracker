export type NationalTeamInfo = {
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  logoUrl?: string;
  teamLabel: string;
  sourceUrl: string;
  verifiedAt: string;
};

const NATIONAL_TEAM_PLAYERS: Record<string, NationalTeamInfo> = {
  "22398210032285": {
    countryCode: "FI",
    countryName: "Finland",
    flagEmoji: "🇫🇮",
    logoUrl: "https://finnhandball.net/wp-content/uploads/2021/12/SKPL-Site-logo-340x156-1.png",
    teamLabel: "Finlands landslag",
    sourceUrl: "https://finnhandball.net/huippu-urheilu/maajoukkueet/naiset/",
    verifiedAt: "2026-06-07",
  },
};

export function getNationalTeamInfo(playerId: bigint | string) {
  return NATIONAL_TEAM_PLAYERS[playerId.toString()];
}
