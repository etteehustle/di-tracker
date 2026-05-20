"use client";

import { CalendarIcon, Clock2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DayPickerProps } from "react-day-picker";
import { dateTimeInput } from "../../lib/domain/format";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DateTimePickerProps = {
  label: string;
  value: string;
  disabled?: DayPickerProps["disabled"];
  onChange: (value: string) => void;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function fromValue(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function timeValue(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function DateTimePicker({ label, value, disabled, onChange }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const selectedDate = useMemo(() => fromValue(value), [value]);
  const draftDate = useMemo(() => fromValue(draftValue), [draftValue]);

  useEffect(() => {
    if (!open) setDraftValue(value);
  }, [open, value]);

  function updateDate(nextDate?: Date) {
    if (!nextDate) return;
    const nextValue = new Date(
      nextDate.getFullYear(),
      nextDate.getMonth(),
      nextDate.getDate(),
      draftDate.getHours(),
      draftDate.getMinutes(),
      draftDate.getSeconds()
    );
    setDraftValue(toLocalInputValue(nextValue));
  }

  function updateTime(nextTime: string) {
    const [hourRaw, minuteRaw, secondRaw = "0"] = nextTime.split(":");
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    const second = Number(secondRaw);
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) return;

    const nextValue = new Date(draftDate);
    nextValue.setHours(hour, minute, second, 0);
    setDraftValue(toLocalInputValue(nextValue));
  }

  function confirm() {
    onChange(draftValue);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="datetime-trigger">
          <CalendarIcon size={16} />
          <span>{dateTimeInput(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="datetime-popover" side="bottom" align="start" sideOffset={6}>
        <Card className="datetime-card">
          <CardContent className="datetime-card-content">
            <Calendar
              mode="single"
              selected={draftDate}
              defaultMonth={draftDate}
              onSelect={updateDate}
              disabled={disabled}
              className="datetime-calendar"
            />
          </CardContent>
          <CardFooter className="datetime-card-footer">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`time-${label.toLowerCase()}`}>{label} Time</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id={`time-${label.toLowerCase()}`}
                    aria-label={`${label} time`}
                    type="time"
                    lang="en-GB"
                    value={timeValue(draftDate)}
                    onChange={(event) => updateTime(event.target.value)}
                  />
                  <InputGroupAddon>
                    <Clock2Icon size={16} />
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
            <div className="datetime-actions">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={confirm}>
                Ok
              </Button>
            </div>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
