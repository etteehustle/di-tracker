import { formatNumber } from "./number-format";

export function money(value: number, digits = 2): string {
  return `${formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits })} USDT`;
}

export function amount(value: number, digits = 6): string {
  return formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function percent(value: number, digits = 2): string {
  return `${formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function dateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function dateTimeInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return [
    pad2(date.getDate()),
    pad2(date.getMonth() + 1),
    date.getFullYear()
  ].join("/") + ` ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseDateTimeInput(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  const date = new Date(year, month - 1, day, hour, minute);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}`;
}

export function legacyDateTime(value: string): string {
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
