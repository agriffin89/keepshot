import { useState } from "react";
import "./App.css";
import { UploadArea } from "./components/UploadArea";
import { TimeInput } from "./components/TimeInput";
import { extractScreenshots } from "./services/api";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [times, setTimes] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ⬇️ Download using BLOB so the browser doesn't navigate to localhost:5000
  const downloadImage = async (url: string, index: number) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download screenshot: ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `keepshot_${index + 1}.jpg`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(objectUrl);
  };

  const handleExtract = async () => {
    if (!file) {
      alert("Please upload a video file first.");
      return;
    }

    const cleanedTimes = times.map((t) => t.trim()).filter(Boolean);

    if (!cleanedTimes.length) {
      alert("Please enter at least one time.");
      return;
    }

    const invalid = cleanedTimes.find((t) => !/^\d{2}:\d{2}$/.test(t));
    if (invalid) {
      alert(`"${invalid}" is not valid. Please use mm:ss format.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await extractScreenshots(file, cleanedTimes);

      // ⬇️ Download all screenshots, one file per time
      await Promise.all(
        result.imageUrls.map((url, idx) => downloadImage(url, idx))
      );
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

  const handleAddScreenshotClick = () => {
    setTimes((prev) => [...prev, "00:05"]);
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

          <div className="controls-row">
            <span className="label">Screenshot at</span>

            <div className="time-inputs">
              {times.map((value, index) => (
                <TimeInput
                  key={index}
                  value={value}
                  onChange={(newValue) => {
                    const next = [...times];
                    next[index] = newValue;
                    setTimes(next);
                  }}
                />
              ))}
            </div>

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

          {error && <p style={{ color: "#e55353", marginTop: 12 }}>{error}</p>}
        </div>
      </main>
    </div>
  );
}

export default App;
