import { useState } from "react";
import "./App.css";
import { UploadArea } from "./components/UploadArea";
import { TimeInput } from "./components/TimeInput";
import { extractMultipleScreenshots } from "./services/api";

type ScreenshotInput = {
  id: string;
  time: string;
};

const createScreenshotInput = (time: string): ScreenshotInput => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  time,
});

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [screenshots, setScreenshots] = useState<ScreenshotInput[]>([
    createScreenshotInput("00:05"),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadImage = async (url: string, fileName = "keepshot.jpg") => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to download image");
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(blobUrl);
  };

  const handleAddScreenshot = () => {
    const last = screenshots[screenshots.length - 1];
    const defaultTime = last?.time || "00:05";

    setScreenshots((prev) => [...prev, createScreenshotInput(defaultTime)]);
  };

  const handleRemoveScreenshot = (id: string) => {
    setScreenshots((prev) =>
      prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)
    );
  };

  const handleTimeChange = (id: string, value: string) => {
    setScreenshots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, time: value } : s))
    );
  };

  const handleExtract = async () => {
    if (!file) {
      alert("Please upload a video file first.");
      return;
    }

    const times = screenshots.map((s) => s.time);

    // basic validation: all must be mm:ss
    const invalid = times.some((t) => !/^\d{2}:\d{2}$/.test(t));
    if (invalid) {
      alert("Please enter all times in mm:ss format.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await extractMultipleScreenshots(file, times);

      // Download all images, one by one
      for (let i = 0; i < result.imageUrls.length; i++) {
        const url = result.imageUrls[i];
        const time = times[i] ?? "00:00";
        const safeTime = time.replace(":", "-");
        await downloadImage(url, `keepshot-${safeTime}.jpg`);
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

          {/* Multiple screenshot inputs */}
          {screenshots.map((item) => (
            <div className="controls-row" key={item.id}>
              <span className="label">Screenshot at</span>
              <TimeInput
                value={item.time}
                onChange={(value) => handleTimeChange(item.id, value)}
              />
              {screenshots.length > 1 && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => handleRemoveScreenshot(item.id)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <div className="controls-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAddScreenshot}
              disabled={!file}
            >
              + Add screenshot
            </button>
          </div>

          <div className="controls-row">
            <button
              className="btn-primary"
              onClick={handleExtract}
              disabled={loading || !file}
            >
              {loading ? "Processing..." : "Download"}
            </button>
          </div>

          {error && <p style={{ color: "#e55353", marginTop: 12 }}>{error}</p>}
        </div>
      </main>
    </div>
  );
}

export default App;
