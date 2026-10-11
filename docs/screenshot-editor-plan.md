# Plan: Screenshot beautifier + mockup web app (Pika.style → Shots.so)

## Context
A web app in the style of **pika.style** (make one screenshot look good: background, padding, frame, shadow, size presets, export) and **shots.so** (device mockups, 3D tilt, layouts with several images). This document is the feature and layout plan. Milestones M0 and M1 are built in [`apps/screenshot-editor/`](../apps/screenshot-editor/).

Decisions: **both, in phases** · **Next.js + TypeScript + Tailwind** · **runs entirely in the browser, no accounts** for now · **static export hosted at `https://<workspace>.bitbucket.io/screenshot-editor/`**, deployed by GitHub Actions.

Note: the feature list was written from existing knowledge of both products, without checking the live sites, so check it against them before building.

---

## 1. Layout

### Desktop (≥1024px)
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ◧ Logo   Untitled design ✎    ↶ ↷  │  Size: X post 1600×900 ▾  │ 64% ▾ │ ⧉ Copy │ ⬇ Export ▾ │
├────┬─────────────────────────┬───────────────────────────────────────────┤
│ ▣  │  CONTEXT PANEL (320px)  │                                           │
│Frame│  e.g. "Background"     │          CANVAS WORKSPACE                  │
│ ◐  │  ┌ Solid│Grad│Mesh│Img ┐│      (neutral backdrop, zoom/pan)         │
│ BG │  │ swatch grid         ││     ┌─────────────────────────────┐       │
│ ✦  │  │ angle ◯──────       ││     │  ░░░ background ░░░          │       │
│Style│  │ noise ◯──────      ││     │   ┌───────────────────┐     │       │
│ T  │  └─────────────────────┘│     │   │ ● ● ●  url bar    │     │       │
│Text│                         │     │   │   screenshot      │     │       │
│ ✎  │                         │     │   └───────────────────┘     │       │
│Annot│                        │     │      Headline text          │       │
│ ▦  │                         │     └─────────────────────────────┘       │
│Layout│ (Phase 2)             │   [ floating toolbar on the selected item ]│
│ ★  │                         │                                           │
│Tmpl│                         │                                           │
└────┴─────────────────────────┴───────────────────────────────────────────┘
```
- **Icon rail + one panel** (like Canva). The canvas stays wide, and Phase 2 adds tabs (Layout, Device, 3D) without changing the layout.
- **Top bar**: project name, undo/redo, size preset, zoom (Fit / 50 / 100 / 200%), **Copy** (to clipboard) and **Export** (format, scale and filename in a popover).
- **Canvas**: click the background to open the Background tab, click the screenshot to open Style; drag to reposition with snapping to center guides; double-click the image to replace it; scroll or pinch to zoom.
- **Empty state**: a large drop zone, "Drop, paste ⌘V, or click to upload", plus "Try a sample image".

### Mobile (<768px)
The canvas sits on top. Below it is a tab bar with the same tabs as the rail; tapping a tab opens its controls in a bottom sheet. Export is a sticky button in the top-right corner.

---

## 2. Features by phase

### Phase 1: Pika-style single-screenshot editor
| Area | Features |
|---|---|
| **Input** | Drag and drop, paste from clipboard, file picker, sample images, replace image. PNG, JPG and WebP. |
| **Canvas size** | **Auto** (fits the image plus padding) and presets: X/Twitter 1600×900, LinkedIn 1200×627, OG image 1200×630, Instagram 1080×1080 / 1080×1350 / story 1080×1920, Product Hunt 1270×760, Dribbble 1600×1200, YouTube 1280×720. Custom W×H with aspect lock. |
| **Background** | Solid, linear or radial gradient (preset swatches, stop editor, angle), mesh-gradient presets, image or wallpaper (built-in or uploaded), **"From image"** (gradient built from the screenshot's dominant colors), transparent. Noise/grain and blur sliders. |
| **Screenshot style** | Padding/scale, 9-point alignment plus free drag, corner radius, shadow presets (none, soft, medium, floating, hard) and custom (x, y, blur, spread, color, opacity), border (width, color, "glass" look), **inset** (inner padding filled with the screenshot's edge color), rotation. |
| **Frames** | None, macOS window (traffic lights, light or dark), browser (Safari / Chrome / Arc-style minimal, editable URL and title), Windows window, glass, outline. |
| **Text** | Headline and subtitle: font (a curated set of Google Fonts), size, weight, color, alignment; placed above, below, left or right of the screenshot, or freely. |
| **Annotate** | Arrow, rectangle/highlight, **blur or pixelate redaction**, numbered step badges. |
| **Branding** | Watermark or logo plus handle text, with position and opacity. A local **brand kit** stores your colors, fonts and logo. |
| **Templates** | A gallery of curated one-click presets (they keep your image and change the style). "Save as my preset" stores your own. |
| **Export** | PNG, JPEG (quality slider) or WebP at 1×, 2×, 3× or 4×. Copy to clipboard. Custom filename. |
| **Editor basics** | Undo/redo, autosave and restore of the last design, shortcuts (⌘V paste, ⌘⇧C copy, ⌘S export, ⌘Z / ⌘⇧Z, Delete, arrow-key nudge), light/dark interface, "Reset style". |

### Phase 2: Shots-style mockups
| Area | Features |
|---|---|
| **Devices** | Phone (notch or dynamic island, several colors), Android phone, tablet, laptop, desktop monitor, watch, plus the browser and window frames from Phase 1. Screenshot fills the screen with fit, fill or crop. |
| **Multi-image layouts** | 1–4 images in a set of layout presets: side by side, stacked, overlapping cascade, phone in front of laptop, grid. Each image has its own image and device. |
| **3D / perspective** | Tilt presets (flat, tilt left or right, isometric, floating) plus rotate-X/Y/Z and perspective sliders, with a reflection/shadow on the ground. |
| **Scenes** | Backgrounds made for mockups: studio gradients, blurred wallpapers, shadow overlays (window light, leaves). |

### Phase 3: Later, needs a backend (out of scope for now)
Screenshot a page from its URL (a headless-browser service), accounts and cloud projects, share links, paid plans that remove the watermark, animated or video export (WebCodecs / ffmpeg.wasm).

---

## 3. Architecture (recommended)

### Rendering: Konva canvas, not html-to-image
The obvious alternative is `html-to-image`, which captures the page's HTML as an image. For this product **react-konva** (a canvas library) is the better choice:
- The preview and the export come from **the same drawing code**, so the export matches what you see. `stage.toDataURL({ pixelRatio })` gives any export scale.
- html-to-image is known to be unreliable in **Safari**, needs every web font embedded by hand, and handles CSS 3D transforms inconsistently. Export is the core of this app, so that risk is too high.
- Konva has drag, select and resize handles built in, which text and annotations need.
- Effects Konva lacks are drawn on a hidden helper canvas and passed in as images: mesh gradients, noise, the glass/background blur, redaction blur.
- **Phase 2 3D tilt**: draw the device and screenshot on a hidden canvas, bend it into perspective with a small **WebGL** step (or a three.js plane), then place the result on the Konva canvas like any image. Phase 1 code doesn't change.

### State: one document you can save and reload
```ts
type Design = {
  version: 1;
  canvas: { preset: SizePresetId | 'auto' | 'custom'; width: number; height: number };
  background: SolidBg | LinearBg | RadialBg | MeshBg | ImageBg | AutoBg | { kind: 'transparent' };
  backgroundFx: { noise: number; blur: number };
  layers: Layer[];   // Phase 1: one ShotLayer + Text/Annotation layers. Phase 2: several ShotLayers.
};
type ShotLayer = {
  id: string; kind: 'shot'; imageId: string;          // the image itself is stored in IndexedDB
  x: number; y: number; scale: number; rotation: number;
  radius: number; inset: number; border: BorderSpec; shadow: ShadowSpec;
  frame: FrameSpec;                                    // none | window | browser | glass | …
  device?: DeviceSpec; transform3d?: Transform3D;      // Phase 2
};
type Template = { id: string; name: string; thumbnail: string; design: DeepPartial<Omit<Design,'layers'>> & { shot?: Partial<ShotLayer> } };
```
- **zustand** holds the editor state; **zundo** (an add-on for zustand) gives undo/redo. A **zod** schema checks designs loaded from storage or a preset file.
- **IndexedDB** (through `idb-keyval`) stores image files and the autosave. localStorage holds only small settings such as the last tab and the theme.
- Templates and size presets are plain TypeScript data files, so adding one is a one-file change.

### Libraries
Next.js (App Router; the editor page is client-only and loaded with `dynamic(..., { ssr: false })`), Tailwind, **shadcn/ui** (Radix-based: Slider, Popover, Tabs, Tooltip, Sheet for the mobile bottom sheet), `react-colorful` (color picker), `lucide-react` (icons), `fast-average-color` or `node-vibrant` (for "From image"), Vitest, Playwright.

### Folder structure
Paths are relative to `apps/screenshot-editor/`. M1 built the parts it needs; the rest arrive with later milestones.
```
app/
  page.tsx                 # landing page: hero, example outputs, "Open editor"
  editor/page.tsx          # loads the client-only Editor
components/editor/
  Editor.tsx  TopBar.tsx  ToolRail.tsx  EmptyState.tsx  ExportPopover.tsx
  panels/    FramePanel  BackgroundPanel  StylePanel  TextPanel  AnnotatePanel  TemplatesPanel  (P2: LayoutPanel  DevicePanel  TiltPanel)
  canvas/    DesignStage.tsx  nodes/{Background,Shot,WindowFrame,BrowserFrame,Text,Arrow,Redact}.tsx
  controls/  LabeledSlider  ColorField  GradientEditor  Segmented  PresetGrid  NumberField
lib/
  design/    schema.ts  defaults.ts  sizes.ts  gradients.ts  templates.ts  frames.ts  (P2: devices.ts  layouts.ts)
  store/     editor.ts            # zustand + zundo
  render/    mesh.ts  noise.ts  blur.ts  (P2: perspective-webgl.ts)
  image/     load.ts  dominantColors.ts
  export/    exportImage.ts  clipboard.ts
  persist/   idb.ts
public/devices/            # P2: device frame drawings (SVG) + where the screen sits in each
```

### Device artwork (Phase 2)
Draw your own simplified **SVG device frames**, or use a set whose license allows it. Avoid Apple marketing images: their license restricts this kind of use. Each device's data file records where the screen sits and its corner radius, so the screenshot drops into the right spot.

---

## 4. Milestones
1. **M0 Setup** (built): Next.js, Tailwind, shadcn-style components, zustand, react-konva, ESLint/Prettier, Vitest, Playwright; static export deployed to a Bitbucket website subfolder (`<workspace>.bitbucket.io/screenshot-editor/`) by GitHub Actions.
2. **M1 Core loop (MVP)** (built): upload or paste → gradient background, padding, corner radius, shadow → PNG export at 2×. Already useful on its own. Browser tests run in Chromium locally and in Chromium, Firefox and WebKit in CI.
3. **M2 Full styling**: size presets, all background types, window and browser frames, border, inset, alignment and drag, copy to clipboard, JPEG/WebP, undo/redo, autosave, shortcuts, mobile layout.
4. **M3 Content**: text, annotations and redaction, watermark and brand kit, templates gallery, saved presets, landing page.
5. **M4 Phase 2a**: 2D device mockups and layouts with several images.
6. **M5 Phase 2b**: 3D tilt (the WebGL perspective step) and mockup scenes.

---

## 5. Verification (for each milestone, once built)
- **Unit (Vitest)**: schema checks, applying a template keeps the user's image, size presets give the right width and height, the "From image" colors.
- **End-to-end (Playwright on Chromium, WebKit and Firefox)**: upload `fixtures/sample.png` → apply a template → export PNG at 2× → check the file is 3200×1800 for the X preset; screenshot the canvas and compare against a saved reference; test copy to clipboard (Chromium); reload and confirm the autosaved design comes back.
- **Manual**: export in Safari, paste the result into X or LinkedIn and check it looks right, try the mobile bottom sheet on a real phone.
