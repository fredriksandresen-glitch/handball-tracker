const NATIONAL_TEAM_PLAYERS = {
  "22398210032285": {
    countryCode: "FI",
    countryName: "Finland",
    flagEmoji: "🇫🇮",
    logoUrl: "https://finnhandball.net/wp-content/uploads/2021/12/SKPL-Site-logo-340x156-1.png",
    teamLabel: "Finlands landslag",
    sourceUrl: "https://finnhandball.net/huippu-urheilu/maajoukkueet/naiset/",
    verifiedAt: "2026-06-07"
  }
};
function getNationalTeamInfo(playerId) {
  return NATIONAL_TEAM_PLAYERS[playerId.toString()];
}
export {
  getNationalTeamInfo as g
};
