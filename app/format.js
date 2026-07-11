export function formatDuration(ms, options = {}) {
  const includeHours = options.includeHours ?? ms >= 60 * 60 * 1000;
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (includeHours) {
    return [hours, minutes, seconds].map(pad).join(":");
  }

  return [minutes, seconds].map(pad).join(":");
}

function pad(value) {
  return String(value).padStart(2, "0");
}
