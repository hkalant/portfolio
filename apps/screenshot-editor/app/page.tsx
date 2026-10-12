import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BrookesLogo } from "@/components/editor/BrookesLogo";
import { buttonVariants } from "@/components/ui/button";

const FEATURES = [
  {
    title: "Gradient backgrounds",
    text: "Twelve presets with an adjustable angle.",
  },
  {
    title: "Padding, corners, shadow",
    text: "Frame the screenshot the way you want.",
  },
  { title: "Sharp PNG export", text: "Saved at twice the design size." },
  {
    title: "Private by design",
    text: "Everything runs in your browser. Nothing is uploaded.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh font-sans text-foreground scheme-light ambient dark:scheme-dark">
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-10 px-6 py-16">
        <div className="flex items-center gap-4 font-semibold">
          <BrookesLogo className="hidden h-10 w-auto text-(--obu-charcoal) sm:block dark:text-foreground" />
          <span className="hidden h-8 w-px bg-border sm:block" aria-hidden />
          Screenshot Editor
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Make your screenshots look good.
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Drop in a screenshot, add a gradient background, padding, rounded
            corners and a shadow, then export a PNG ready for social posts, docs
            and slides.
          </p>
        </div>
        <div>
          <Link href="/editor/" className={buttonVariants({ size: "lg" })}>
            Open editor
            <ArrowRight aria-hidden />
          </Link>
        </div>
        <ul className="grid gap-x-8 gap-y-5 rounded-xl border-t-4 border-primary glass p-6 sm:grid-cols-2 sm:p-8">
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <p className="font-semibold">{feature.title}</p>
              <p className="text-sm text-muted-foreground">{feature.text}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
