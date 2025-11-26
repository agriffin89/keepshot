import type { ChangeEvent, FC } from "react";
import "./TimeInput.css";

interface TimeInputProps {
  value: string; // "mm:ss"
  onChange: (value: string) => void;
}

export const TimeInput: FC<TimeInputProps> = ({ value, onChange }) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (/^[0-9:]*$/.test(v) && v.length <= 5) {
      onChange(v);
    }
  };

  return (
    <input
      className="time-input"
      value={value}
      onChange={handleChange}
      placeholder="mm:ss"
    />
  );
};
