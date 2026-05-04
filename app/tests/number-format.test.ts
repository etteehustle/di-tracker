import { describe, expect, it } from "vitest";
import { formatNumber, formatNumericInputText, parseFormattedNumber } from "../lib/domain/number-format";
import { amount, money } from "../lib/domain/format";

describe("number formatting", () => {
  it("uses dot thousand separators for displayed money and coin amounts", () => {
    expect(money(80000)).toBe("80.000,00 USDT");
    expect(amount(1234567.123456)).toBe("1.234.567,123456");
  });

  it("formats numeric input text while keeping decimal values editable", () => {
    expect(formatNumericInputText("80000")).toBe("80.000");
    expect(formatNumericInputText("0.123456")).toBe("0,123456");
    expect(formatNumericInputText("35.99708619")).toBe("35,99708619");
    expect(formatNumericInputText("8.000")).toBe("8.000");
  });

  it("parses formatted and plain user input", () => {
    expect(parseFormattedNumber("80.000")).toBe(80000);
    expect(parseFormattedNumber("8.000")).toBe(8000);
    expect(parseFormattedNumber("35,99708619")).toBeCloseTo(35.99708619, 10);
    expect(parseFormattedNumber("35.99708619")).toBeCloseTo(35.99708619, 10);
    expect(parseFormattedNumber("abc")).toBeNull();
    expect(formatNumber(80000)).toBe("80.000");
  });
});
