import { useState } from "react";
import "./App.css";
import { UploadArea } from "./components/UploadArea";
import { TimeInput } from "./components/TimeInput";
import { extractScreenshot } from "./services/api";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [time, setTime] = useState("00:05");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadImage = (url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = "keepshot.jpg";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExtract = async () => {
    if (!file) {
      alert("Please upload a video file first.");
      return;
    }

    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      alert("Please enter a valid time in mm:ss format.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await extractScreenshot(file, time);
      downloadImage(result.imageUrl);
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

  // For now this is only UI – later we’ll hook it to the multi-screenshot feature
  const handleAddScreenshotClick = () => {
    console.log("TODO: add another screenshot input");
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

          {/* controls row in a single line: label + input + Download + plus */}
          <div className="controls-row">
            <span className="label">Screenshot at</span>

            <TimeInput value={time} onChange={setTime} />

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
