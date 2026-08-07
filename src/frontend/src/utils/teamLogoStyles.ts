function normalizeTeamLogoName(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a");
}

export function getTeamLogoClassName(teamName?: string) {
  const normalized = normalizeTeamLogoName(teamName);

  if (normalized === "kjelsas" || normalized === "volda" || normalized === "ravens" || normalized === "molde") {
    return "team-logo-darkmode-white";
  }

  if (normalized === "levanger") {
    return "team-logo-lightmode-navy";
  }

  return "";
}
