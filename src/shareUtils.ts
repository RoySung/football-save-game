/**
 * Share Utilities — Canvas compositing for score sharing image generation
 * Uses the share_template.jpg as base and overlays the score text via Canvas API
 */

import i18n from "./i18n";

const SHARE_URL = "https://football-save-game.roysunghan.workers.dev/";
const TEMPLATE_PATH = "/assets/share_template.jpg";

// Bulletin board area coordinates (on the 1024x682 template)
// The board inner cream area spans roughly x:95–720, y:155–520
// The Football Save logo occupies the top ~y:95–200 area
// The visual center of the empty board area below the logo is x:400, y:365
const BOARD = {
  centerX: 522,
  centerY: 328,
} as const;

/**
 * Load an image from a URL and return it as an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Generate a share image by compositing the score onto the template.
 * Returns a Blob of the generated PNG image.
 */
export async function generateShareImage(
  score: number,
  lang: string,
): Promise<Blob> {
  const templateImg = await loadImage(TEMPLATE_PATH);

  // Wait for fonts to be loaded so they are rendered correctly on the canvas
  try {
    await document.fonts.ready;
  } catch (e) {
    console.warn("Fonts not fully loaded, drawing with fallback font", e);
  }

  const canvas = document.createElement("canvas");
  canvas.width = templateImg.naturalWidth;
  canvas.height = templateImg.naturalHeight;
  const ctx = canvas.getContext("2d")!;

  // Draw template background
  ctx.drawImage(templateImg, 0, 0);

  // --- Draw "X SAVES!" text centered on the board ---
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const savesText = i18n.t("share.canvasText", { count: score, lng: lang });

  // Draw cartoon stroke (outline)
  ctx.font = "bold 36px 'Nunito', 'M PLUS Rounded 1c', sans-serif";
  ctx.strokeStyle = "#4E342E";
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.strokeText(savesText, BOARD.centerX, BOARD.centerY);

  // Draw main text fill (white)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(savesText, BOARD.centerX, BOARD.centerY);

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to generate share image"));
    }, "image/png");
  });
}

/**
 * Build the share text with score and URL.
 */
export function getShareText(score: number, lang: string): string {
  return i18n.t("share.message", { count: score, shareUrl: SHARE_URL, lng: lang });
}

/**
 * Share score using Web Share API (with image) or fallback to download.
 * Returns true if sharing was handled, false otherwise.
 */
export async function shareScore(
  score: number,
  lang: string,
): Promise<boolean> {
  try {
    const imageBlob = await generateShareImage(score, lang);
    const shareText = getShareText(score, lang);
    const file = new File([imageBlob], "football-save-score.png", {
      type: "image/png",
    });

    // Try Web Share API with files support (mobile browsers)
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        text: shareText,
        files: [file],
      });
      return true;
    }

    // Fallback: Try Web Share API without files (text only)
    if (navigator.share) {
      // Download the image separately
      downloadBlob(imageBlob, "football-save-score.png");
      await navigator.share({
        text: shareText,
      });
      return true;
    }

    // Final fallback: Download image + copy text to clipboard
    downloadBlob(imageBlob, "football-save-score.png");
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // Clipboard API may not be available
    }
    return true;
  } catch (error) {
    // User cancelled share or error occurred
    if ((error as Error)?.name === "AbortError") {
      return false; // User cancelled - not an error
    }
    console.error("Share failed:", error);
    return false;
  }
}

/**
 * Helper to trigger a download of a blob.
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
