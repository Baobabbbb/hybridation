/**
 * API client for Plan2Shop AI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface GenerateResponse {
  success: boolean;
  image: string;
  enhanced_style: string;
}

export interface Product {
  title: string;
  price: number | string;
  currency: string;
  image: string;
  link: string;
  source: string;
}

export interface ShopResponse {
  success: boolean;
  products: Product[];
  total: number;
}

/**
 * Generate a furnished room from an architectural plan
 */
export async function generateFurnishedRoom(
  file: File,
  style: string
): Promise<GenerateResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("style", style);

  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Generation failed" }));
    throw new Error(error.detail || "Failed to generate image");
  }

  return response.json();
}

/**
 * Search for similar products using visual search
 */
export async function searchProducts(imageBlob: string): Promise<ShopResponse> {
  const formData = new FormData();
  formData.append("image_blob", imageBlob);

  const response = await fetch(`${API_BASE_URL}/shop`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Search failed" }));
    throw new Error(error.detail || "Failed to search products");
  }

  return response.json();
}

/**
 * Convert a canvas crop area to base64 image
 */
export function cropImageToBase64(
  image: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  scale: number = 1
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Calculate the actual crop dimensions based on the displayed image
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL("image/png");
}
