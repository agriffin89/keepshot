import type { ChangeEvent, FC } from "react";
import "./TimeInput.css";

interface TimeInputProps {
  value: string; // "HH:MM:SS:FF"
  onChange: (value: string) => void;
  maxFrames?: number; // default 120
}

export const TimeInput: FC<TimeInputProps> = ({
  value,
  onChange,
  maxFrames = 120,
}) => {
  const formatTime = (raw: string) => {
    // keep digits only (HHMMSSFF max)
    const digits = raw.replace(/\D/g, "").slice(0, 8);

    const hh = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const ss = digits.slice(4, 6);
    const ff = digits.slice(6, 8);

    const parts: string[] = [];
    if (hh) parts.push(hh);
    if (mm) parts.push(mm);
    if (ss) parts.push(ss);
    if (ff) parts.push(ff);

    return parts.join(":");
  };

  const clamp = (v: string, max: number) =>
    Math.min(Number(v || 0), max)
      .toString()
      .padStart(2, "0");

  const normalize = (formatted: string) => {
    const parts = formatted.split(":");

    const hh = clamp(parts[0] ?? "0", 99);
    const mm = clamp(parts[1] ?? "0", 59);
    const ss = clamp(parts[2] ?? "0", 59);
    const ff = clamp(parts[3] ?? "0", maxFrames);

    return [hh, mm, ss, ff].join(":");
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow clearing
    if (raw === "") {
      onChange("");
      return;
    }

    // If user typed anything other than digits/colons/spaces, IGNORE the change
    // (this makes your test "abc" => not called pass)
    if (!/^[0-9:\s]*$/.test(raw)) return;

    const formatted = formatTime(raw);

    // If formatted becomes empty but raw wasn't empty (e.g. ":::") ignore
    if (!formatted) return;

    onChange(formatted);
  };

  const handleBlur = () => {
    if (!value) return;
    onChange(normalize(value));
  };

  return (
    <input
      className="time-input"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="HH:MM:SS:FF"
      inputMode="numeric"
      maxLength={11}
    />
  );
};
