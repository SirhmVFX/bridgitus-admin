"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Youtube from "@tiptap/extension-youtube";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  MdFormatBold, MdFormatItalic, MdStrikethroughS, MdFormatUnderlined,
  MdSubscript, MdSuperscript, MdFormatClear, MdLink, MdLinkOff,
  MdFormatListNumbered, MdFormatListBulleted, MdFormatIndentDecrease,
  MdFormatIndentIncrease, MdFormatQuote, MdHorizontalRule,
  MdTableChart, MdFunctions, MdImage, MdVideoLibrary, MdMap,
  MdEmojiEmotions, MdCloudUpload, MdUndo, MdRedo,
} from "react-icons/md";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TEXT_COLORS = [
  "#000000", "#001233", "#00369b", "#dc2626", "#ea580c",
  "#ca8a04", "#16a34a", "#0891b2", "#7c3aed", "#db2777",
];
const HIGHLIGHT_COLORS = [
  "#fef08a", "#bbf7d0", "#bae6fd", "#ddd6fe", "#fecdd3", "#e2e8f0", "#ffffff",
];
const SPECIAL_CHARS = [
  "±", "×", "÷", "≤", "≥", "≠", "≈", "√", "∞", "π", "°", "′", "″",
  "½", "⅓", "⅔", "¼", "¾", "€", "£", "¥", "©", "®", "™", "§", "¶",
  "•", "…", "—", "–", "«", "»", "α", "β", "γ", "δ", "θ", "λ", "μ", "σ", "Ω", "Σ",
];
const EMOJIS = [
  "😀", "🙂", "😎", "🤔", "👍", "👏", "🎉", "⭐", "🔥", "✅", "❌",
  "📚", "✏️", "📝", "🧠", "💡", "🏆", "🎯", "📌", "❗", "❓", "❤️",
];

function FloatingMenu({
  open,
  anchorRef,
  className,
  children,
  onClose,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  className: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const maxLeft = window.innerWidth - 200;
      setPos({
        top: rect.bottom + 4,
        left: Math.min(rect.left, Math.max(8, maxLeft)),
      });
    };
    update();
    const onScroll = () => onClose();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [open, anchorRef, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`${className} is-fixed`}
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body,
  );
}
export default function WysiwygEditor({
  content,
  onChange,
  placeholder = "Start writing…",
}: Props) {
  const imageRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textColorBtnRef = useRef<HTMLSpanElement>(null);
  const highlightBtnRef = useRef<HTMLSpanElement>(null);
  const charsBtnRef = useRef<HTMLSpanElement>(null);
  const emojiBtnRef = useRef<HTMLSpanElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showChars, setShowChars] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      Subscript,
      Superscript,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ImageExtension.configure({ allowBase64: false }),
      Youtube.configure({ controls: true, modestBranding: true }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate({ editor: ed }) {
      onChange(ed.getHTML());
    },
    editorProps: { attributes: { class: "tiptap-content" } },
    immediatelyRender: false,
  });

  // Keep external content in sync when parent resets form
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current && content !== undefined) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (!showTextColor && !showHighlight && !showChars && !showEmoji) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        textColorBtnRef.current?.contains(t) ||
        highlightBtnRef.current?.contains(t) ||
        charsBtnRef.current?.contains(t) ||
        emojiBtnRef.current?.contains(t)
      ) {
        return;
      }
      const menus = document.querySelectorAll(".tiptap-palette.is-fixed, .tiptap-char-grid.is-fixed");
      for (const m of menus) {
        if (m.contains(t)) return;
      }
      setShowTextColor(false);
      setShowHighlight(false);
      setShowChars(false);
      setShowEmoji(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showTextColor, showHighlight, showChars, showEmoji]);

  if (!editor) return null;

  function setLink() {
    const prev = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL:", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function insertEquation() {
    const latex = window.prompt(
      "Enter equation or formula (plain text or LaTeX):",
      "E = mc^2",
    );
    if (!latex) return;
    editor
      ?.chain()
      .focus()
      .insertContent(
        `<span class="tiptap-equation" contenteditable="false">${latex
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</span>&nbsp;`,
      )
      .run();
  }

  function insertMap() {
    const query = window.prompt("Map location (address or place name):", "Melbourne, Australia");
    if (!query) return;
    const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    editor
      ?.chain()
      .focus()
      .insertContent(
        `<div class="tiptap-map"><iframe src="${src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map"></iframe></div><p></p>`,
      )
      .run();
  }

  function insertYoutube() {
    const url = window.prompt("Paste YouTube URL:");
    if (!url) return;
    editor?.commands.setYoutubeVideo({ src: url, width: 640, height: 360 });
  }

  async function uploadAndInsert(
    file: File,
    kind: "image" | "media" | "file",
  ) {
    if (!editor) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "bridgitus/materials");
      if (kind === "image") {
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } else if (kind === "media" && file.type.startsWith("video/")) {
        editor
          .chain()
          .focus()
          .insertContent(
            `<video controls src="${url}" style="max-width:100%;border-radius:12px"></video><p></p>`,
          )
          .run();
      } else if (kind === "media" && file.type.startsWith("audio/")) {
        editor
          .chain()
          .focus()
          .insertContent(`<audio controls src="${url}"></audio><p></p>`)
          .run();
      } else {
        editor
          .chain()
          .focus()
          .insertContent(
            `<a href="${url}" target="_blank" rel="noopener" class="tiptap-file-link">📎 ${file.name}</a>&nbsp;`,
          )
          .run();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const T = ({
    onClick,
    active,
    title,
    children,
    disabled,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={active ? "is-active" : ""}
    >
      {children}
    </button>
  );

  return (
    <div className="tiptap-editor">
      <div className="tiptap-toolbar">
        {/* Row 1 — text styling */}
        <div className="tiptap-toolbar-row">
          <T onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
            <MdFormatBold size={16} />
          </T>
          <T onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
            <MdFormatItalic size={16} />
          </T>
          <T onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
            <MdStrikethroughS size={16} />
          </T>
          <T onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
            <MdFormatUnderlined size={16} />
          </T>
          <T onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} title="Subscript">
            <MdSubscript size={16} />
          </T>
          <T onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} title="Superscript">
            <MdSuperscript size={16} />
          </T>

          <span className="tiptap-sep" />

          <span className="tiptap-dropdown-wrap" ref={textColorBtnRef}>
            <T onClick={() => { setShowTextColor((v) => !v); setShowHighlight(false); setShowChars(false); setShowEmoji(false); }} title="Text colour">
              <span className="tiptap-color-btn">A<span style={{ color: editor.getAttributes("textStyle").color || "#000" }}>—</span></span>
            </T>
            <FloatingMenu
              open={showTextColor}
              anchorRef={textColorBtnRef}
              className="tiptap-palette"
              onClose={() => setShowTextColor(false)}
            >
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  style={{ background: c }}
                  title={c}
                  onClick={() => {
                    editor.chain().focus().setColor(c).run();
                    setShowTextColor(false);
                  }}
                />
              ))}
              <button type="button" className="tiptap-palette-clear" onClick={() => { editor.chain().focus().unsetColor().run(); setShowTextColor(false); }}>
                Clear
              </button>
            </FloatingMenu>
          </span>

          <span className="tiptap-dropdown-wrap" ref={highlightBtnRef}>
            <T onClick={() => { setShowHighlight((v) => !v); setShowTextColor(false); setShowChars(false); setShowEmoji(false); }} title="Highlight">
              <span className="tiptap-hl-btn">A</span>
            </T>
            <FloatingMenu
              open={showHighlight}
              anchorRef={highlightBtnRef}
              className="tiptap-palette"
              onClose={() => setShowHighlight(false)}
            >
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  style={{ background: c }}
                  title={c}
                  onClick={() => {
                    if (c === "#ffffff") editor.chain().focus().unsetHighlight().run();
                    else editor.chain().focus().toggleHighlight({ color: c }).run();
                    setShowHighlight(false);
                  }}
                />
              ))}
            </FloatingMenu>
          </span>

          <span className="tiptap-sep" />

          <select
            className="tiptap-format-select"
            title="Format"
            value={
              editor.isActive("heading", { level: 1 }) ? "h1"
                : editor.isActive("heading", { level: 2 }) ? "h2"
                  : editor.isActive("heading", { level: 3 }) ? "h3"
                    : editor.isActive("heading", { level: 4 }) ? "h4"
                      : "p"
            }
            onChange={(e) => {
              const v = e.target.value;
              const chain = editor.chain().focus();
              if (v === "p") chain.setParagraph().run();
              else chain.toggleHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 | 4 }).run();
            }}
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
          </select>

          <T
            onClick={() =>
              editor.chain().focus().unsetAllMarks().clearNodes().run()
            }
            title="Clear formatting"
          >
            <MdFormatClear size={16} />
          </T>

          <span className="tiptap-sep" />

          <T onClick={setLink} active={editor.isActive("link")} title="Insert / edit link">
            <MdLink size={16} />
          </T>
          <T
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Remove link"
            disabled={!editor.isActive("link")}
          >
            <MdLinkOff size={16} />
          </T>

          <span className="tiptap-sep" />

          <T onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
            <MdFormatListNumbered size={16} />
          </T>
          <T onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bulleted list">
            <MdFormatListBulleted size={16} />
          </T>
          <T
            onClick={() => editor.chain().focus().liftListItem("listItem").run()}
            title="Decrease indent"
          >
            <MdFormatIndentDecrease size={16} />
          </T>
          <T
            onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
            title="Increase indent"
          >
            <MdFormatIndentIncrease size={16} />
          </T>
          <T onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
            <MdFormatQuote size={16} />
          </T>
        </div>

        {/* Row 2 — inserts & media */}
        <div className="tiptap-toolbar-row">
          <span className="tiptap-dropdown-wrap" ref={charsBtnRef}>
            <T onClick={() => { setShowChars((v) => !v); setShowEmoji(false); setShowTextColor(false); setShowHighlight(false); }} title="Special characters">
              Ω
            </T>
            <FloatingMenu
              open={showChars}
              anchorRef={charsBtnRef}
              className="tiptap-char-grid"
              onClose={() => setShowChars(false)}
            >
              {SPECIAL_CHARS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().insertContent(ch).run();
                    setShowChars(false);
                  }}
                >
                  {ch}
                </button>
              ))}
            </FloatingMenu>
          </span>

          <T onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal line">
            <MdHorizontalRule size={16} />
          </T>
          <T
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            title="Insert table"
          >
            <MdTableChart size={16} />
          </T>
          <T onClick={insertEquation} title="Equation / formula">
            <MdFunctions size={16} />
          </T>

          <span className="tiptap-sep" />

          <T
            onClick={() => imageRef.current?.click()}
            title="Insert image"
            disabled={uploading}
          >
            <MdImage size={16} />
          </T>
          <T
            onClick={() => {
              const choice = window.confirm(
                "OK = upload video/audio file\nCancel = embed YouTube URL",
              );
              if (choice) mediaRef.current?.click();
              else insertYoutube();
            }}
            title="Insert media (video / audio / YouTube)"
            disabled={uploading}
          >
            <MdVideoLibrary size={16} />
          </T>
          <T onClick={insertMap} title="Insert map">
            <MdMap size={16} />
          </T>

          <span className="tiptap-dropdown-wrap" ref={emojiBtnRef}>
            <T onClick={() => { setShowEmoji((v) => !v); setShowChars(false); setShowTextColor(false); setShowHighlight(false); }} title="Emoji">
              <MdEmojiEmotions size={16} />
            </T>
            <FloatingMenu
              open={showEmoji}
              anchorRef={emojiBtnRef}
              className="tiptap-char-grid emoji"
              onClose={() => setShowEmoji(false)}
            >
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().insertContent(em).run();
                    setShowEmoji(false);
                  }}
                >
                  {em}
                </button>
              ))}
            </FloatingMenu>
          </span>

          <T
            onClick={() => fileRef.current?.click()}
            title="Upload file attachment"
            disabled={uploading}
          >
            <MdCloudUpload size={16} />
          </T>

          <span className="tiptap-sep" />

          <T onClick={() => editor.chain().focus().undo().run()} title="Undo">
            <MdUndo size={16} />
          </T>
          <T onClick={() => editor.chain().focus().redo().run()} title="Redo">
            <MdRedo size={16} />
          </T>

          {uploading && <span className="tiptap-uploading">Uploading…</span>}
        </div>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadAndInsert(f, "image");
          e.target.value = "";
        }}
      />
      <input
        ref={mediaRef}
        type="file"
        accept="video/*,audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadAndInsert(f, "media");
          e.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,image/*,video/*,audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadAndInsert(f, "file");
          e.target.value = "";
        }}
      />
    </div>
  );
}
