"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { MdUpload, MdClose } from "react-icons/md";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
}

export default function ImageUpload({ value, onChange, label = "Image", folder = "bridgitus/materials" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, folder);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="admin-label">{label}</label>
      {value ? (
        <div className="relative border border-gray-200 rounded-lg overflow-hidden inline-block">
          <Image src={value} alt="Uploaded" width={320} height={200} className="w-full max-w-xs h-40 object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-black/60 text-white p-0.5 rounded"
            title="Remove"
          >
            <MdClose size={14} />
          </button>
        </div>
      ) : (
        <div
          className="border border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#00369b] transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <MdUpload size={24} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">Click to upload image</p>
          <p className="text-xs text-gray-400 mt-1">Max 20 MB</p>
        </div>
      )}
      {uploading && <p className="text-xs text-[#00369b] mt-1">Uploading…</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="admin-input mt-2 text-xs"
        placeholder="Or paste image URL"
      />
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
