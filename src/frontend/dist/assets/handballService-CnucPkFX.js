import "./index-urhzO2zV.js";
function formatMatchDate(startTimeNs) {
  const ms = Number(startTimeNs / 1000000n);
  const d = new Date(ms);
  return d.toLocaleDateString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function getCountdown(startTimeNs) {
  const ms = Number(startTimeNs / 1000000n);
  const diffMs = ms - Date.now();
  if (diffMs <= 0) return "Startet";
  const days = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
  const hours = Math.floor(diffMs % (1e3 * 60 * 60 * 24) / (1e3 * 60 * 60));
  const mins = Math.floor(diffMs % (1e3 * 60 * 60) / (1e3 * 60));
  if (days > 0) return `${days}d ${hours}t`;
  if (hours > 0) return `${hours}t ${mins}m`;
  return `${mins}m`;
}
function computeFormSparkline(stats) {
  return stats.slice(-5).map((s) => Number(s.goals ?? 0n));
}
export {
  computeFormSparkline as c,
  formatMatchDate as f,
  getCountdown as g
};
