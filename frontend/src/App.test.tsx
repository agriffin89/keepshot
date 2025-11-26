import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";

// Mock the extractScreenshot API
jest.mock("./services/api", () => ({
  extractScreenshot: jest.fn(async (file, time) => ({
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
    fireEvent.click(screen.getByText(/extract/i));
    await waitFor(() => {
      expect(screen.getByText(/upload video file/i)).toBeInTheDocument();
    });
  });

  it("uploads file, enters time, extracts screenshot, and shows preview", async () => {
    render(<App />);
    // Simulate file upload
    const file = new File(["dummy content"], "video.mp4", {
      type: "video/mp4",
    });
    const input = screen.getByLabelText(/upload video file/i, {
      selector: "input[type='file']",
    });
    fireEvent.change(input, { target: { files: [file] } });
    // Enter time
    const timeInput = screen.getByPlaceholderText("mm:ss");
    fireEvent.change(timeInput, { target: { value: "01:23" } });
    // Click extract
    fireEvent.click(screen.getByText(/extract/i));
    // Wait for preview
    await waitFor(() => {
      expect(extractScreenshot).toHaveBeenCalledWith(file, "01:23");
      expect(screen.getByText(/preview/i)).toBeInTheDocument();
      expect(screen.getByAltText(/screenshot/i)).toHaveAttribute(
        "src",
        "mocked-url.jpg"
      );
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
    fireEvent.click(screen.getByText(/extract/i));
    await waitFor(() => {
      expect(screen.getByText(/api error/i)).toBeInTheDocument();
    });
  });
});
