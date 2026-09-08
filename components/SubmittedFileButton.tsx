"use client";

import { MdAttachFile } from "react-icons/md";

type Props = {
  url?: string | null;
  name?: string | null;
  /** Compact table-cell style */
  emptyLabel?: string;
};

/** Clear CTA for student-uploaded PDF/document submissions. */
export default function SubmittedFileButton({
  url,
  name,
  emptyLabel = "—",
}: Props) {
  if (!url) {
    return <span className="text-xs text-gray-400">{emptyLabel}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#00369b]/25 bg-[#00369b]/5 px-2.5 py-1.5 text-xs font-semibold text-[#00369b] hover:bg-[#00369b]/10 transition-colors"
      title={name || "View submitted file"}
    >
      <MdAttachFile size={14} />
      View submitted file
    </a>
  );
}
