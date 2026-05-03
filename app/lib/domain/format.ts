export function money(value: number, digits = 2): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value)} USDT`;
}

export function amount(value: number, digits = 6): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(value);
}

export function percent(value: number, digits = 2): string {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value)}%`;
}

export function dateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function hoursUntil(value: string, now = new Date()): number {
  return Math.max(0, (new Date(value).getTime() - now.getTime()) / 36e5);
}

export function lockDays(startTime: string, settlementTime: string): number {
  return Math.max(1 / 24, (new Date(settlementTime).getTime() - new Date(startTime).getTime()) / 864e5);
}
