import { render, screen, fireEvent } from "@testing-library/react";
import { TimeInput } from "./TimeInput";

describe("TimeInput", () => {
  it("renders with initial value", () => {
    render(<TimeInput value="00:00:01:23" onChange={() => {}} />);
    expect(screen.getByDisplayValue("00:00:01:23")).toBeInTheDocument();
  });

  it("calls onChange with valid input", () => {
    const mockFn = jest.fn();
    render(<TimeInput value="" onChange={mockFn} />);
    const input = screen.getByPlaceholderText("HH:MM:SS:FF");
    fireEvent.change(input, { target: { value: "12:34:56:78" } });
    expect(mockFn).toHaveBeenCalledWith("12:34:56:78");
  });

  it("does not call onChange with invalid input", () => {
    const mockFn = jest.fn();
    render(<TimeInput value="" onChange={mockFn} />);
    const input = screen.getByPlaceholderText("HH:MM:SS:FF");
    fireEvent.change(input, { target: { value: "abc" } });
    expect(mockFn).not.toHaveBeenCalled();
  });
});
