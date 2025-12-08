import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { UploadArea } from "./UploadArea";

describe("UploadArea", () => {
  it("renders upload prompt when no file is selected", () => {
    render(
      <UploadArea
        file={null}
        durationSeconds={null}
        onFileSelected={() => {}}
        onDurationChange={() => {}}
      />
    );
    expect(screen.getByText(/upload video file/i)).toBeInTheDocument();
  });
});
