const NUMBER_LOCALE = "vi-VN";

export type NumberFormatOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

function countOccurrences(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

function splitNumericParts(input: string): { integerPart: string; fractionalPart: string; hasDecimal: boolean } {
  const sanitized = input.replace(/[^\d.,]/g, "");
  if (!sanitized) return { integerPart: "", fractionalPart: "", hasDecimal: false };

  const commaIndex = sanitized.indexOf(",");
  const dotCount = countOccurrences(sanitized, ".");
  const dotIndex = sanitized.indexOf(".");
  const integerBeforeDot = dotIndex > -1 ? sanitized.slice(0, dotIndex).replace(/\D/g, "") : "";
  const digitsAfterDot = dotIndex > -1 ? sanitized.slice(dotIndex + 1).replace(/\D/g, "") : "";
  const dotLooksDecimal = dotCount === 1 && dotIndex > -1 && (digitsAfterDot.length !== 3 || integerBeforeDot === "0");
  const decimalIndex = commaIndex > -1 ? commaIndex : dotLooksDecimal ? dotIndex : -1;

  if (decimalIndex < 0) {
    return {
      integerPart: sanitized.replace(/\D/g, ""),
      fractionalPart: "",
      hasDecimal: false
    };
  }

  return {
    integerPart: sanitized.slice(0, decimalIndex).replace(/\D/g, ""),
    fractionalPart: sanitized.slice(decimalIndex + 1).replace(/\D/g, ""),
    hasDecimal: true
  };
}

export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 6
  }).format(value);
}

export function formatNumericInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return formatNumber(value, { maximumFractionDigits: 12 });
}

export function formatNumericInputText(input: string): string {
  const { integerPart, fractionalPart, hasDecimal } = splitNumericParts(input);
  if (!integerPart && !hasDecimal) return "";

  const groupedInteger = integerPart ? formatNumber(Number(integerPart), { maximumFractionDigits: 0 }) : "0";
  if (!hasDecimal) return groupedInteger;

  return `${groupedInteger},${fractionalPart}`;
}

export function parseFormattedNumber(input: string): number | null {
  const { integerPart, fractionalPart, hasDecimal } = splitNumericParts(input);
  if (!integerPart && !fractionalPart) return null;

  const normalized = hasDecimal ? `${integerPart || "0"}.${fractionalPart || "0"}` : integerPart;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
