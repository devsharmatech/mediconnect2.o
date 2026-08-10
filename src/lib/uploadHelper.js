import { uploadToS3, deleteFromS3, extractKeyFromUrl } from "@/lib/s3";

export async function uploadProfilePicture(file, userId, oldUrl) {
  if (!file) return oldUrl;

  const ext = file.name?.split(".").pop() || "jpg";
  const key = `profile-pictures/${userId}-${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { url } = await uploadToS3(buffer, key, file.type || "image/jpeg");

  // Delete old image if exists
  if (oldUrl) {
    const oldKey = extractKeyFromUrl(oldUrl);
    if (oldKey) await deleteFromS3(oldKey);
  }

  return url;
}
