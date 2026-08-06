"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Highlight],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-text min-h-[110px] rounded-b-md px-3 py-2 text-sm focus:outline-none",
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep the editor in sync when the parent resets `value` externally (e.g.
  // clearing the draft after "Add Question").
  useEffect(() => {
    if (editor && value !== editor.getHTML() && value === "") {
      editor.commands.clearContent();
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-md border border-gray-300">
      <div className="flex flex-wrap gap-1 rounded-t-md border-b border-gray-300 bg-gray-50 p-1.5">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          label="Highlight"
        >
          <mark className="rounded px-0.5">H</mark>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          • ―
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Numbered list"
        >
          1. ―
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded px-2 py-1 text-xs font-medium ${
        active ? "bg-brand-100 text-brand-700" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

