/**
 * Utility: uploadCmsMedia
 *
 * Uploads media files reliably to S3 + CloudFront.
 * Uses Direct S3 Presigned PUT URL by default to completely bypass
 * Nginx / Vercel body limits (avoiding "413 Request Entity Too Large").
 * Falls back to multipart form upload if presigned generation is unavailable.
 */

// Optional client-side image compression for large photos (> 1.5MB)
async function compressImageIfLarge(file, maxDimension = 2400, quality = 0.88) {
  if (typeof window === "undefined" || !file || !file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }
  // If file is already under 1.5MB, no need to compress
  if (file.size <= 1.5 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const outputType = file.type === "image/png" && file.size > 3 * 1024 * 1024 ? "image/jpeg" : file.type;
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                const compressedFile = new File([blob], file.name, {
                  type: outputType,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            outputType,
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch {
      resolve(file);
    }
  });
}

export async function uploadCmsMedia(originalFile) {
  if (!originalFile) {
    throw new Error("No file provided for upload.");
  }

  // Optimize if large image
  const file = await compressImageIfLarge(originalFile);

  // Strategy 1: Direct Browser-to-S3 Presigned URL (Bypasses Nginx 413 limits entirely)
  try {
    const presignedRes = await fetch("/api/cms/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "image/jpeg",
      }),
    });

    if (presignedRes.ok) {
      const presignedData = await presignedRes.json();
      if (presignedData.success && presignedData.signedUrl) {
        // Upload directly to AWS S3 using presigned PUT URL
        const s3UploadRes = await fetch(presignedData.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!s3UploadRes.ok) {
          throw new Error(`S3 direct upload failed with HTTP ${s3UploadRes.status}`);
        }

        return {
          success: true,
          url: presignedData.url,
        };
      }
    }
  } catch (presignedErr) {
    console.warn("Direct S3 upload via presigned URL failed, trying fallback:", presignedErr);
  }

  // Strategy 2: Fallback to Multipart FormData
  const formData = new FormData();
  formData.append("file", file);

  const fallbackRes = await fetch("/api/cms/upload", {
    method: "POST",
    body: formData,
  });

  if (!fallbackRes.ok) {
    if (fallbackRes.status === 413) {
      throw new Error(
        "File is too large for the web server (413 Request Entity Too Large). Please upload an image under 5MB or compress it."
      );
    }
    const text = await fallbackRes.text();
    let errorMsg = `Upload failed (${fallbackRes.status})`;
    try {
      const json = JSON.parse(text);
      if (json.error) errorMsg = json.error;
    } catch {
      if (text.includes("413 Request Entity Too Large")) {
        errorMsg = "File is too large for web server (413).";
      }
    }
    throw new Error(errorMsg);
  }

  const result = await fallbackRes.json();
  if (!result.success) {
    throw new Error(result.error || "Upload failed");
  }

  return result;
}
