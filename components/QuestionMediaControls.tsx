"use client";

import { useRef, useState } from "react";
import {
  MdImage, MdVideocam, MdLink, MdClose, MdCloudUpload,
} from "react-icons/md";
import { uploadToCloudinary } from "@/lib/cloudinary";

const VIDEO_MAX_MB = 40;
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

type Props = {
  imageUrl?: string;
  videoUrl?: string;
  videoName?: string;
  onChange: (patch: {
    imageUrl?: string | null;
    videoUrl?: string | null;
    videoName?: string | null;
  }) => void;
  /** Hide AI generate (used on AI generator page separately). */
  compact?: boolean;
};

export default function QuestionMediaControls({
  imageUrl,
  videoUrl,
  videoName,
  onChange,
  compact = false,
}: Props) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState(videoUrl ?? "");
  const [error, setError] = useState("");

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploadingImage(true);
    try {
      const url = await uploadToCloudinary(file, "bridgitus/question-images");
      onChange({ imageUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      if (imageRef.current) imageRef.current.value = "";
    }
  }

  async function handleVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
      setError(`Video must be under ${VIDEO_MAX_MB}MB.`);
      if (videoRef.current) videoRef.current.value = "";
      return;
    }
    if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov)$/i.test(file.name)) {
      setError("Only MP4, WebM, or MOV videos are accepted.");
      if (videoRef.current) videoRef.current.value = "";
      return;
    }
    setUploadingVideo(true);
    try {
      const url = await uploadToCloudinary(file, "bridgitus/question-videos", {
        maxMb: VIDEO_MAX_MB,
      });
      onChange({ videoUrl: url, videoName: file.name });
      setLinkOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video upload failed");
    } finally {
      setUploadingVideo(false);
      if (videoRef.current) videoRef.current.value = "";
    }
  }

  function saveLink() {
    const url = linkValue.trim();
    if (!url) {
      setError("Enter a video URL.");
      return;
    }
    try {
      const parsed = new URL(url);
      if (!/^https?:$/i.test(parsed.protocol)) throw new Error("bad");
    } catch {
      setError("Enter a valid https:// video link (YouTube, Vimeo, or direct MP4).");
      return;
    }
    setError("");
    onChange({ videoUrl: url, videoName: "External video link" });
    setLinkOpen(false);
  }

  return (
    <div className="space-y-2 mt-2">
      {!compact && (
        <p className="text-[11px] text-slate-400">
          Optional media — image (diagram) and/or video (upload ≤{VIDEO_MAX_MB}MB MP4/WebM/MOV, or paste a link).
        </p>
      )}

      {imageUrl ? (
        <div className="space-y-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Question diagram"
            className="max-h-40 border border-gray-200 object-contain rounded-lg bg-white"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              disabled={uploadingImage}
              className="text-xs text-[#00369b] font-medium hover:underline"
            >
              {uploadingImage ? "Uploading…" : "Replace image"}
            </button>
            <button
              type="button"
              onClick={() => onChange({ imageUrl: null })}
              className="text-xs text-red-500 font-medium hover:underline"
            >
              Remove image
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => imageRef.current?.click()}
          disabled={uploadingImage}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00369b] border border-[#00369b]/25 bg-white px-2.5 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-50"
        >
          <MdImage size={14} />
          {uploadingImage ? "Uploading…" : "Upload image"}
        </button>
      )}

      {videoUrl ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <MdVideocam size={14} /> {videoName || "Video attached"}
          </p>
          {/youtube\.com|youtu\.be|vimeo\.com/i.test(videoUrl) ? (
            <div
              className="relative w-full overflow-hidden rounded-lg border border-gray-200 bg-black"
              style={{ paddingTop: "56.25%" }}
            >
              <iframe
                src={
                  (() => {
                    try {
                      const u = new URL(videoUrl);
                      const host = u.hostname.replace(/^www\./, "");
                      if (host === "youtu.be") {
                        const id = u.pathname.replace(/^\//, "");
                        return id ? `https://www.youtube.com/embed/${id}` : videoUrl;
                      }
                      if (host.includes("youtube.com")) {
                        const id = u.searchParams.get("v") || u.pathname.split("/embed/")[1];
                        return id ? `https://www.youtube.com/embed/${id}` : videoUrl;
                      }
                      if (host.includes("vimeo.com")) {
                        const id = u.pathname.split("/").filter(Boolean)[0];
                        return id ? `https://player.vimeo.com/video/${id}` : videoUrl;
                      }
                    } catch {
                      /* fall through */
                    }
                    return videoUrl;
                  })()
                }
                title={videoName || "Question video"}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video
              src={videoUrl}
              controls
              playsInline
              className="w-full max-h-56 rounded-lg border border-gray-200 bg-black"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => videoRef.current?.click()}
              disabled={uploadingVideo}
              className="text-xs text-[#00369b] font-medium hover:underline"
            >
              {uploadingVideo ? "Uploading…" : "Replace upload"}
            </button>
            <button
              type="button"
              onClick={() => {
                setLinkValue(videoUrl);
                setLinkOpen(true);
              }}
              className="text-xs text-[#00369b] font-medium hover:underline"
            >
              Change link
            </button>
            <button
              type="button"
              onClick={() => onChange({ videoUrl: null, videoName: null })}
              className="text-xs text-red-500 font-medium hover:underline"
            >
              Remove video
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            disabled={uploadingVideo}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-800 border border-rose-200 bg-rose-50 px-2.5 py-1.5 rounded-lg hover:bg-rose-100 disabled:opacity-50"
          >
            <MdCloudUpload size={14} />
            {uploadingVideo ? "Uploading video…" : `Upload video (≤${VIDEO_MAX_MB}MB)`}
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkValue("");
              setLinkOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
          >
            <MdLink size={14} /> Paste video link
          </button>
        </div>
      )}

      {linkOpen && (
        <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-white">
          <p className="text-[11px] text-slate-500">
            Criteria: https YouTube / Vimeo / Loom / direct .mp4 URL. Uploads must be MP4, WebM or MOV and ≤{VIDEO_MAX_MB}MB.
          </p>
          <input
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            className="admin-input text-sm"
            placeholder="https://www.youtube.com/watch?v=…"
          />
          <div className="flex gap-2">
            <button type="button" onClick={saveLink} className="btn-primary text-xs py-1.5 px-3">
              Save link
            </button>
            <button
              type="button"
              onClick={() => setLinkOpen(false)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
          {error}
        </p>
      )}

      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
      <input
        ref={videoRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={handleVideo}
      />
    </div>
  );
}
