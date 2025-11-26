import React, { useState } from "react";
import "./UploadArea.css";

type UploadAreaProps = {
  file: File | null;
  durationSeconds: number | null;
  onFileSelected: (file: File | null) => void;
  onDurationChange: (durationSeconds: number | null) => void;
};

const formatDuration = (seconds: number) => {
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export const UploadArea: React.FC<UploadAreaProps> = ({
  file,
  durationSeconds,
  onFileSelected,
  onDurationChange,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const generateThumbnailAndDuration = (
    selected: File,
    onDuration: (d: number | null) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(selected);
      const video = document.createElement("video");

      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.src = url;

      video.onloadedmetadata = () => {
        const duration = video.duration;
        if (!Number.isNaN(duration)) {
          onDuration(duration);
        }

        const captureTime =
          duration && !Number.isNaN(duration)
            ? Math.min(duration / 2, duration - 0.1)
            : 0;

        video.currentTime = captureTime > 0 ? captureTime : 0;
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          onDuration(null);
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        onDuration(null);
        reject(new Error("Could not load video"));
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;

    onFileSelected(selected);
    onDurationChange(null);
    setThumbnailUrl(null);

    if (!selected) return;

    try {
      const thumb = await generateThumbnailAndDuration(
        selected,
        onDurationChange
      );
      setThumbnailUrl(thumb);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <label className="upload-area">
      <input
        type="file"
        accept="video/mp4,video/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div className="upload-inner">
        {/* Empty state: icon + text */}
        {!file || !thumbnailUrl ? (
          <>
            <div className="upload-icon" />
            <span className="upload-text">Upload video file</span>
          </>
        ) : (
          /* Filled state: YouTube-style frame */
          <div className="upload-thumb-frame">
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="upload-thumb-image"
            />
            <span className="upload-thumb-duration">
              {durationSeconds != null
                ? formatDuration(durationSeconds)
                : "00:00"}
            </span>
          </div>
        )}
      </div>
    </label>
  );
};
