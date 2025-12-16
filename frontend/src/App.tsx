import { useState } from "react";
import "./App.css";
import { UploadArea } from "./components/UploadArea";
import { TimeInput } from "./components/TimeInput";
import { extractScreenshot, extractScreenshots } from "./services/api";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);

  // Always HH:MM:SS:FF
  const [screenshotTimes, setScreenshotTimes] = useState<string[]>([""]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- helpers ----------
  const isValidHHMMSSFF = (t: string, maxFrames = 120) => {
    // exact format
    if (!/^\d{2}:\d{2}:\d{2}:\d{2}$/.test(t)) return false;

    const [hh, mm, ss, ff] = t.split(":").map((x) => Number(x));
    if (
      Number.isNaN(hh) ||
      Number.isNaN(mm) ||
      Number.isNaN(ss) ||
      Number.isNaN(ff)
    )
      return false;

    // ranges
    if (mm < 0 || mm > 59) return false;
    if (ss < 0 || ss > 59) return false;
    if (ff < 0 || ff > maxFrames) return false;

    // hh range is up to you; keeping 0–99 for now
    if (hh < 0 || hh > 99) return false;

    return true;
  };

  const downloadImage = async (url: string, index?: number) => {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
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
    // start new rows as 00:00:00:00 so it's always valid-looking
    setScreenshotTimes((prev) => [...prev, "00:00:00:00"]);
  };

  const handleRemoveTime = (index: number) => {
    setScreenshotTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExtract = async () => {
    if (!file) {
      alert("Please upload a video file first.");
      return;
    }

    // keep only non-empty (should already be valid-ish due to TimeInput)
    const cleaned = screenshotTimes.map((t) => t.trim()).filter(Boolean);

    if (cleaned.length === 0) {
      alert("Please enter at least one timestamp.");
      return;
    }

    // validate strictly HH:MM:SS:FF + ranges
    const maxFrames = 120;
    for (const t of cleaned) {
      if (!isValidHHMMSSFF(t, maxFrames)) {
        alert(`Invalid time "${t}". Use HH:MM:SS:FF (FF max ${maxFrames}).`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (cleaned.length === 1) {
        // single timestamp
        const result = await extractScreenshot(file, cleaned[0]);
        await downloadImage(result.imageUrl);
      } else {
        // multiple timestamps
        const result = await extractScreenshots(file, cleaned);
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

          {/* First row */}
          <div className="controls-row">
            <span className="label">Screenshot at</span>

            <TimeInput
              value={screenshotTimes[0] ?? "00:00:00:00"}
              onChange={(val) => handleTimeChange(0, val)}
              maxFrames={120}
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
              disabled={!file || loading}
              aria-label="Add screenshot time"
            >
              +
            </button>
          </div>

          {/* Additional rows */}
          {screenshotTimes.slice(1).map((t, i) => {
            const realIndex = i + 1;
            return (
              <div className="controls-row" key={realIndex}>
                <span className="label label--spacer" />

                <TimeInput
                  value={t}
                  onChange={(val) => handleTimeChange(realIndex, val)}
                  maxFrames={120}
                />

                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => handleRemoveTime(realIndex)}
                  aria-label="Remove screenshot time"
                  disabled={loading}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            );
          })}

          {error && <p style={{ color: "#e55353", marginTop: 12 }}>{error}</p>}
        </div>
      </main>
    </div>
  );
}

export default App;
