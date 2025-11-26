import { render, screen, fireEvent } from "@testing-library/react";
import { UploadArea } from "./UploadArea";

describe("UploadArea", () => {
  it("renders upload prompt when no file is selected", () => {
    render(<UploadArea file={null} onFileSelected={() => {}} />);
    expect(screen.getByText(/upload video file/i)).toBeInTheDocument();
  });

  it("shows file name when file is selected", () => {
    const file = new File(["dummy"], "video.mp4", { type: "video/mp4" });
    render(<UploadArea file={file} onFileSelected={() => {}} />);
    expect(screen.getByText(/video.mp4/i)).toBeInTheDocument();
  });

  it("calls onFileSelected when file is uploaded", () => {
    const mockFn = jest.fn();
    render(<UploadArea file={null} onFileSelected={mockFn} />);
    const input = screen.getByLabelText(/upload video file/i, {
      selector: "input[type='file']",
    });
    const file = new File(["dummy"], "video.mp4", { type: "video/mp4" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(mockFn).toHaveBeenCalledWith(file);
  });
});
