import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

// Mock the extractScreenshot API
jest.mock("./services/api", () => ({
  extractScreenshot: jest.fn(async () => ({
    imageUrl: "mocked-url.jpg",
  })),
}));

import { extractScreenshot } from "./services/api";

describe("Keepshot App workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows error if extract is clicked without file", async () => {
    render(<App />);
    fireEvent.click(screen.getByText(/download/i));
    await waitFor(() => {
      expect(screen.getByText(/upload video file/i)).toBeInTheDocument();
    });
  });

  it("shows error if API fails", async () => {
    (extractScreenshot as jest.Mock).mockRejectedValueOnce(
      new Error("API error")
    );
    render(<App />);
    const file = new File(["dummy content"], "video.mp4", {
      type: "video/mp4",
    });
    const input = screen.getByLabelText(/upload video file/i, {
      selector: "input[type='file']",
    });
    fireEvent.change(input, { target: { files: [file] } });
    const timeInput = screen.getByPlaceholderText("mm:ss");
    fireEvent.change(timeInput, { target: { value: "01:23" } });
    fireEvent.click(screen.getByText(/download/i));
    await waitFor(() => {
      expect(screen.getByText(/api error/i)).toBeInTheDocument();
    });
  });
});
