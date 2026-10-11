import type { Metadata } from "next";
import EditorLoader from "@/components/editor/EditorLoader";

export const metadata: Metadata = { title: "Editor" };

export default function EditorPage() {
  return <EditorLoader />;
}
