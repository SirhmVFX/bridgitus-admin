const MAX_SIZE_MB = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export async function uploadToCloudinary(
  file: File,
  folder = "bridgitus"
): Promise<string> {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File exceeds the ${MAX_SIZE_MB}MB limit.`);
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary environment variables are not configured.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder);

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  const endpoint = isImage
    ? `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
    : isVideo
    ? `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`
    : `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;

  const res = await fetch(endpoint, { method: "POST", body: formData });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "File upload failed.");
  }

  const data = await res.json();
  return data.secure_url as string;
}
