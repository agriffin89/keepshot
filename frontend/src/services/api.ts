export interface ExtractResponse {
  imageUrl: string;
}

export interface MultipleExtractResponse {
  imageUrls: string[];
}

const API_BASE_URL = "https://localhost:7190"; // already using this

export async function extractScreenshot(
  file: File,
  time: string
): Promise<ExtractResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("time", time);

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

// 👇 NEW: multi-screenshot version
export async function extractMultipleScreenshots(
  file: File,
  times: string[]
): Promise<MultipleExtractResponse> {
  const formData = new FormData();
  formData.append("file", file);
  times.forEach((t) => formData.append("times", t));

  const response = await fetch(`${API_BASE_URL}/api/video/extract-multiple`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to extract screenshots");
  }

  return (await response.json()) as MultipleExtractResponse;
}
