import { useEffect, useState } from "react";
import { formatNumericInput, formatNumericInputText, parseFormattedNumber } from "../../lib/domain/number-format";

type FormattedNumberInputProps = {
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
};

export function FormattedNumberInput({ value, onChange, required = false }: FormattedNumberInputProps) {
  const [displayValue, setDisplayValue] = useState(formatNumericInput(value));

  useEffect(() => {
    if (displayValue === "" && value === 0) return;
    const parsed = parseFormattedNumber(displayValue);
    if (parsed !== value) setDisplayValue(formatNumericInput(value));
  }, [displayValue, value]);

  function update(nextValue: string) {
    const displayDigits = displayValue.replace(/\D/g, "");
    const nextDigits = nextValue.replace(/\D/g, "");
    const isAppendingIntegerDigit =
      displayValue !== "" &&
      !displayValue.includes(",") &&
      !nextValue.includes(",") &&
      nextDigits.length === displayDigits.length + 1 &&
      nextDigits.startsWith(displayDigits);

    const formatted = formatNumericInputText(isAppendingIntegerDigit ? nextDigits : nextValue);
    setDisplayValue(formatted);

    const parsed = parseFormattedNumber(formatted);
    if (parsed !== null) onChange(parsed);
    if (formatted === "") onChange(0);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      required={required}
      value={displayValue}
      onChange={(event) => update(event.target.value)}
    />
  );
}
