import { useState } from "react";
import "./App.css";
import { UploadArea } from "./components/UploadArea";
import { TimeInput } from "./components/TimeInput";
import { extractScreenshot, extractScreenshots } from "./services/api";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);

  // multiple timestamps, first one with default "00:05"
  const [screenshotTimes, setScreenshotTimes] = useState<string[]>([""]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadImage = async (url: string, index?: number) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to download image: ${response.status}");
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;

    const suffix = index !== undefined ? `_${index + 1}` : "";
    link.download = `keepshot${suffix}.jpg`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const handleTimeChange = (index: number, value: string) => {
    setScreenshotTimes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddScreenshotClick = () => {
    // just add a new empty time input
    setScreenshotTimes((prev) => [...prev, ""]);
  };

  const handleExtract = async () => {
    if (!file) {
      alert("Please upload a video file first.");
      return;
    }

    // clean & keep only non-empty times
    const cleaned = screenshotTimes
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (cleaned.length === 0) {
      alert("Please enter at least one time in mm:ss format.");
      return;
    }

    // validate all times as mm:ss
    for (const t of cleaned) {
      if (!/^\d{2}:\d{2}$/.test(t)) {
        alert(`Invalid time "${t}". Please use mm:ss (e.g. 04:25).`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (cleaned.length === 1) {
        // 🔹 Single timestamp → /api/video/extract
        const result = await extractScreenshot(file, cleaned[0]);
        await downloadImage(result.imageUrl);
      } else {
        // 🔹 Multiple timestamps → /api/video/extract-multiple
        const result = await extractScreenshots(file, cleaned);
        // result.imageUrls.forEach((url, idx) => downloadImage(url, idx));
        for (let i = 0; i < result.imageUrls.length; i++) {
          await downloadImage(result.imageUrls[i], i);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-wrapper">
          <div className="logo-icon" />
          <span className="logo-text">Keepshot</span>
        </div>
      </header>

      <main className="app-main">
        <div className="card">
          <UploadArea
            file={file}
            durationSeconds={durationSeconds}
            onFileSelected={setFile}
            onDurationChange={setDurationSeconds}
          />

          {/* first row: label + first input + Download + + button */}
          {screenshotTimes.length > 0 && (
            <div className="controls-row">
              <span className="label">Screenshot at</span>

              <TimeInput
                value={screenshotTimes[0]}
                onChange={(val) => handleTimeChange(0, val)}
              />

              <button
                className="btn-primary"
                onClick={handleExtract}
                disabled={loading || !file}
              >
                {loading ? "Processing..." : "Download"}
              </button>

              <button
                type="button"
                className="btn-icon"
                onClick={handleAddScreenshotClick}
                disabled={!file}
                aria-label="Add screenshot time"
              >
                +
              </button>
            </div>
          )}

          {/* any extra time inputs (without label / buttons) */}
          {screenshotTimes.slice(1).map((time, idx) => (
            <div className="controls-row" key={idx + 1}>
              <span className="label label--spacer" />
              <TimeInput
                value={time}
                onChange={(val) => handleTimeChange(idx + 1, val)}
              />
            </div>
          ))}

          {error && <p style={{ color: "#e55353", marginTop: 12 }}>{error}</p>}
        </div>
      </main>
    </div>
  );
}

export default App;
