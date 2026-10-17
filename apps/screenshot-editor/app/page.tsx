import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BrookesLogo } from "@/components/editor/BrookesLogo";
import { buttonVariants } from "@/components/ui/button";
import {
  getGradientPreset,
  GRADIENT_PRESETS,
  toCssLinearGradient,
} from "@/lib/design/gradients";

const FEATURES = [
  {
    title: "Gradient backgrounds",
    text: `${GRADIENT_PRESETS.length} presets with an adjustable angle.`,
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

const BROOKES = getGradientPreset("brookes")!;

/** A stand-in screenshot: a window with a title bar and some lines of text. */
function MockShot({ className }: { className?: string }) {
  return (
    <div className={`overflow-hidden bg-white ${className ?? ""}`}>
      <div className="flex gap-1 bg-(--obu-charcoal-10) px-2 py-1.5">
        <span className="size-1.5 rounded-full bg-[#ff5f57]" />
        <span className="size-1.5 rounded-full bg-[#febc2e]" />
        <span className="size-1.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="space-y-1.5 p-3">
        <div className="h-2 w-3/4 rounded-full bg-(--obu-charcoal-20)" />
        <div className="h-1.5 w-full rounded-full bg-(--obu-charcoal-10)" />
        <div className="h-1.5 w-5/6 rounded-full bg-(--obu-charcoal-10)" />
        <div className="h-1.5 w-2/3 rounded-full bg-(--obu-charcoal-10)" />
      </div>
    </div>
  );
}

/** What the editor does, at a glance: a plain screenshot, then styled. */
function BeforeAfter() {
  return (
    <figure className="grid items-center gap-4 rounded-xl glass p-5 sm:grid-cols-[1fr_auto_1fr] sm:p-6">
      <div className="space-y-2">
        <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-(--workspace) p-4">
          <MockShot className="w-full" />
        </div>
        <p className="text-center text-xs text-muted-foreground">Before</p>
      </div>
      <ArrowRight
        className="mx-auto size-5 rotate-90 text-muted-foreground sm:rotate-0"
        aria-hidden
      />
      <div className="space-y-2">
        <div
          className="flex aspect-[4/3] items-center justify-center rounded-md p-7"
          style={{
            backgroundImage: toCssLinearGradient(BROOKES.angle, BROOKES.stops),
          }}
        >
          <MockShot className="w-full rounded-lg shadow-[0_10px_30px_rgb(0_0_0/35%)]" />
        </div>
        <p className="text-center text-xs text-muted-foreground">After</p>
      </div>
      <figcaption className="sr-only">
        A plain screenshot, then the same screenshot on a gradient background
        with padding, rounded corners and a shadow.
      </figcaption>
    </figure>
  );
}

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
        <BeforeAfter />
        <ul className="grid gap-x-8 gap-y-5 rounded-xl glass p-6 sm:grid-cols-2 sm:p-8">
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
