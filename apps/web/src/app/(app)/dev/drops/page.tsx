import { notFound } from "next/navigation";
import { DropPreview } from "./DropPreview";

/** Development-only preview of every drop light show, without sound. */
export default function DropsPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DropPreview />;
}
