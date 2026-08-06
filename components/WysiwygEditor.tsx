"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useRef, useState } from "react";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function WysiwygEditor({ content, onChange, placeholder = "Start writing…" }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: { attributes: { class: "tiptap-content" } },
    immediatelyRender: false,
  });

  if (!editor) return null;

  function setLink() {
    const url = window.prompt("Enter URL:");
    if (!url) return;
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "bridgitus/materials");
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const T = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button type="button" onClick={onClick} title={title} className={active ? "is-active" : ""}>
      {children}
    </button>
  );

  return (
    <div className="tiptap-editor">
      <div className="tiptap-toolbar">
        <T onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><strong>B</strong></T>
        <T onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><em>I</em></T>
        <T onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough"><s>S</s></T>
        <span className="border-l border-gray-300 mx-1 self-stretch" />
        <T onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1">H1</T>
        <T onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2">H2</T>
        <T onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3">H3</T>
        <span className="border-l border-gray-300 mx-1 self-stretch" />
        <T onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">UL</T>
        <T onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List">OL</T>
        <T onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">{`"`}</T>
        <span className="border-l border-gray-300 mx-1 self-stretch" />
        <T onClick={setLink} active={editor.isActive("link")} title="Add Link">Link</T>
        <T onClick={() => fileInputRef.current?.click()} title="Insert Image" active={uploading}>
          {uploading ? "…" : "Img"}
        </T>
        <span className="border-l border-gray-300 mx-1 self-stretch" />
        <T onClick={() => editor.chain().focus().undo().run()} title="Undo">↩</T>
        <T onClick={() => editor.chain().focus().redo().run()} title="Redo">↪</T>
      </div>
      <EditorContent editor={editor} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
    </div>
  );
}
