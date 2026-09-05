export function timeLeft(endsAt: Date | string, now: Date = new Date()): string {
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return "Ended";

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((ms % 60000) / 1000);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

export function isEndingSoon(endsAt: Date, withinMs = 60 * 60 * 1000): boolean {
  const ms = endsAt.getTime() - Date.now();
  return ms > 0 && ms <= withinMs;
}
