export interface ExtractResponse {
  imageUrl: string;
}

export interface MultiExtractResponse {
  imageUrls: string[];
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7190";

// ---------- SINGLE screenshot (existing behavior) ----------
export async function extractScreenshot(
  file: File,
  time: string
): Promise<ExtractResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("time", time); // mm:ss

  const response = await fetch(`${API_BASE_URL}/api/video/extract`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to extract screenshot");
  }

  return (await response.json()) as ExtractResponse;
}

// ---------- MULTIPLE screenshots (new endpoint) ----------
export async function extractScreenshots(
  file: File,
  times: string[]
): Promise<MultiExtractResponse> {
  const formData = new FormData();
  formData.append("file", file);

  // send each time entry; backend will read them as a collection
  times.forEach((t) => formData.append("times", t));

  const response = await fetch(`${API_BASE_URL}/api/video/extract-multiple`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to extract screenshots");
  }

  return (await response.json()) as MultiExtractResponse;
}
