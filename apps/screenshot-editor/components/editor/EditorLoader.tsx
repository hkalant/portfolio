"use client";

import dynamic from "next/dynamic";
import { EditorSkeleton } from "./EditorSkeleton";

// Konva needs the browser's canvas, so the editor only renders on the client.
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

export default function EditorLoader() {
  return <Editor />;
}
