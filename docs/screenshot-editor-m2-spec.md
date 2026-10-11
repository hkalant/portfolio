> **Draft, paused.** Milestone 2 build contract, written before the M2 build started. It has not been reviewed yet; a review was stopped when work paused. Resume by reviewing this contract, then building the foundation (sections 1–6).

# Milestone 2 build spec (shared contract)

App: `/home/user/portfolio/apps/screenshot-editor` (Next.js 16 static export, React 19.3, konva 10.7.1 + react-konva 19.3, zustand 5, zod 4, Tailwind 4, radix-ui 1.7, Vitest 5 node env, Playwright 1.56.1 against the static export served under `/screenshot-editor/`). M1 is built and green in CI; read `README.md`, `docs/screenshot-editor-plan.md` (product plan, M2 = "Full styling"), and the M1 code before changing anything.

M2 scope (from the product plan): size presets; all background types; window and browser frames; border; inset; alignment and drag; copy to clipboard; JPEG/WebP; export scale 1×–4×; undo/redo; autosave and restore; keyboard shortcuts; mobile layout; light/dark interface; "Reset style". Still out of scope: text, annotations, watermark, templates (M3), device mockups, multiple images, 3D (M4/M5).

Rules that do not change: client-only static export; no server features; every runtime URL respects the base path; M1 behaviour keeps working (existing unit + e2e tests stay green or are updated deliberately); pinned versions; ESLint 9 + TS 5.9 via npm scripts; Prettier; no `next/font/google`.

## 1. Design model v2 (`lib/design/schema.ts`)

```ts
Design = {
  version: 2;
  canvas: CanvasSpec;
  background: Background;
  backgroundFx: { noise: number /* 0..1 */; blur: number /* 0..40 design px, image backgrounds only */ };
  layers: [ShotLayer];             // still exactly one layer in M2
};

CanvasSpec =
  | { preset: "auto" }                                        // canvas = framed shot + 2 × padding
  | { preset: SizePresetId; width: number; height: number }   // from lib/design/sizes.ts
  | { preset: "custom"; width: number; height: number };      // 100..4000 each, integers

Background =
  | { kind: "solid"; color: Hex }
  | { kind: "linear"; presetId: string | null; angle: number; stops: Stop[] }   // M1 shape, unchanged
  | { kind: "radial"; presetId: string | null; stops: Stop[] }                  // centred, farthest-corner
  | { kind: "mesh"; presetId: string }                                          // lib/design/meshes.ts
  | { kind: "image"; source: { type: "upload"; imageId: string } | { type: "wallpaper"; wallpaperId: string } }
  | { kind: "fromImage"; angle: number }       // gradient from the screenshot's own colours, derived at render time
  | { kind: "transparent" };

ShotLayer = {
  id: string; kind: "shot"; imageId: string | null;
  padding: number;                 // 0..200 int, space between framed shot and canvas edge
  scale: number;                   // 0.2..1.5, fixed canvases only (auto ignores it)
  position: { x: number; y: number }; // centre of the framed shot, as a fraction of the canvas (0.5,0.5 = centred); fixed canvases only
  rotation: number;                // -45..45 degrees about the shot's centre
  radius: number;                  // 0..64 outer corner radius of the framed shot
  shadow: ShadowSpec;              // M1 shape; preset "custom" added for hand-tuned values
  border: { width: number /* 0..24 */; color: Hex; opacity: number /* 0..1 */ };
  inset: { size: number /* 0..64 */; color: Hex | "auto" };   // "auto" = the screenshot's edge colour
  frame: FrameSpec;
};

FrameSpec = {
  kind: "none" | "macos" | "browser" | "minimal" | "windows" | "glass" | "outline";
  theme: "light" | "dark";
  title: string;   // macos/windows title bar text, may be ""
  url: string;     // browser address bar text, may be ""
};
```

- `ShadowPresetId` gains `"custom"`. Picking a preset copies its values; editing a shadow value sets `preset: "custom"`.
- Migration: `migrateDesign(unknown): Design | null` accepts v1 (M1 autosaves do not exist, but keep the function for future versions and tests) and v2; returns `null` for anything invalid. Defaults fill new fields.
- Defaults: `createDefaultDesign()` = canvas auto, M1 default gradient, padding 64, scale 1, position centre, rotation 0, radius 12, shadow medium, border width 0 (#ffffff, 0.6), inset 0 auto, frame none/light/""/"".

## 2. Presets and geometry

- `lib/design/sizes.ts`: `SIZE_PRESETS` (id, label, width, height, group): `x-post` 1600×900 "X post", `linkedin` 1200×627, `og` 1200×630 "Open Graph", `instagram-square` 1080×1080, `instagram-portrait` 1080×1350, `story` 1080×1920 "Story", `product-hunt` 1270×760, `dribbble` 1600×1200, `youtube` 1280×720 "YouTube thumbnail". `CUSTOM_SIZE` limits 100..4000.
- `lib/design/frames.ts`: per frame kind, the chrome geometry in design px at natural size: `chromeTop` (macos 32, browser 44, minimal 0, windows 32, glass/outline/none 0), `ring` (glass 14, outline 0, others 0 — padding of the frame material around the image on all sides), and `FRAME_LABELS`. Pure data + helpers, unit tested.
- `lib/design/meshes.ts`: ~8 mesh presets: `{ id, name, base: Hex, blobs: { x, y, r /* fractions of the canvas */, color: Hex }[] }`.
- `lib/design/wallpapers.ts`: ~6 built-in wallpapers: `{ id, name, src (static import of assets/wallpapers/*.webp) }`, generated once by a script (procedural abstract art, no photos, no third-party assets).

## 3. Layout v2 (`lib/design/layout.ts`)

```ts
computeLayout(source: Size /* screenshot natural size */, design: Design): DesignLayout
DesignLayout = {
  canvas: Size;                         // integers
  shot: {
    x: number; y: number;               // top-left of the framed shot before rotation, canvas px
    width: number; height: number;      // framed shot size after scaling
    scale: number;                      // factor applied to the natural framed shot (1 in auto)
    rotation: number;
    radius: number;                     // outer radius after scaling, capped at half the shorter side
    image: Rect;                        // screenshot rect inside the shot box (relative to shot x/y), after inset
    insetRect: Rect | null;             // inset fill rect (relative), when inset > 0
    chrome: Rect | null;                // title/address bar rect (relative), when the frame has one
  };
  draggable: boolean;                   // fixed canvases only
};
```
- Natural framed shot = image fitted to MAX_DESIGN_SIDE (1600) + 2 × inset + 2 × frame ring + chrome top (+ border is drawn inside the outer edge, it does not add size).
- Auto: scale 1, canvas = natural + 2 × padding, shot at (padding, padding).
- Fixed: available = canvas − 2 × padding (min 1); `fit = min(available.w / natural.w, available.h / natural.h)`; `scale = fit × shot.scale`; shot centred at `position × canvas`. Not clamped: dragging may push it partly off the canvas.
- Keep `fitWithin`, `computePreviewScale`, the M1 radius cap rule. Everything pure and unit tested (auto vs fixed, each frame, inset, scale, position).

## 4. Store (`lib/store/editor.ts`) — the only place that changes the design

- History is the store's own, not a library: `past: Design[]`, `future: Design[]` (limit 100). Every design-changing action goes through one internal `commit(next, coalesceKey?)`: if `coalesceKey` equals the previous commit's key and the previous commit was less than 1000 ms ago, it replaces the newest history entry instead of pushing (slider drags, typing, nudges become one undo step). `undo()`, `redo()`, `canUndo`, `canRedo` selectors. Image loads (`setImage`) are undoable too.
- `pruneImages()` keeps every image referenced by the present design and by any design in `past`/`future` (screenshot `imageId` and an upload background's `imageId`).
- Actions (all clamp and round like M1): `setImage`, `clearImage`, `setBackgroundImage(image)` (upload background), `setBackground(bg)`, `applyGradientPreset(id)`, `setGradientKind("linear"|"radial")`, `setGradientAngle`, `setGradientStops(stops)`, `setSolidColor`, `applyMeshPreset`, `setWallpaper`, `setFromImage`, `setTransparent`, `setNoise`, `setBlur`, `setCanvasPreset(id | "auto")`, `setCustomSize(w, h)`, `setPadding`, `setScale`, `setPosition(x, y)`, `nudge(dx, dy)` (design px), `alignTo(h: "start"|"center"|"end", v: …)`, `setRotation`, `setRadius`, `setShadowPreset`, `setShadow(patch)` (→ preset "custom"), `setBorder(patch)`, `setInset(patch)`, `setFrame(patch)`, `resetStyle()` (keeps image and canvas size, resets everything else to defaults; undoable), `loadDesign(design, images)` (autosave restore; clears history).
- UI state stays out of history: `activePanel` (`"background"|"frame"|"style"`), `loading`, `exporting`, `notice`, `exportOptions` (below), `sheetOpen` (mobile).
- Keep M1 selector names working (`selectShot`, `selectActiveImage`); add `selectLayout` helpers as needed. `LoadedImage` gains `blob: Blob` (the original file, for autosave) and `loadImageFromBlob(blob, name, { id? })` accepts a fixed id for restores.

## 5. Export (`lib/export/*`)

- `ExportOptions = { format: "png" | "jpeg" | "webp"; quality: number /* 0.5..1, jpeg/webp */; scale: 1 | 2 | 3 | 4 }`, default png ×2, kept in the store (not in history, not autosaved… may be remembered in localStorage).
- `safePixelRatio(size, wanted)`: largest ratio ≤ wanted with area ≤ 16,777,216 and each side ≤ 16,384; the UI shows the real output size and says when it was capped.
- `exportFilename(source, scale, now, extension)` — extension follows the format.
- JPEG has no alpha: transparent areas are filled white for JPEG only.
- `copyDesignToClipboard(...)`: PNG via `navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })])` (promise form for Safari), called inside the click/keydown handler; on failure a clear error notice ("Couldn't copy the image. Use Export instead.").
- The export keeps M1's guarantees: rendered after a paint, refused while loading, exact `round(w × ratio) × round(h × ratio)` output, layer at true size whatever the zoom, fonts ready (`await document.fonts.ready`) before rendering frames with text.

## 6. Persistence (`lib/persist/*`)

- IndexedDB through `idb-keyval` (new dependency, pinned). Keys: `design` → JSON of the present design; `image:<id>` → `{ blob, name }` for every image the present design references; stale image keys deleted.
- `useAutosave()` hook: debounced 600 ms save after design changes; on first mount, restore (via `migrateDesign`) before showing the empty state, with a short "Restoring your last design…" state. A failed or unavailable IndexedDB never breaks the editor (private windows): it logs nothing to the console as an error and the editor works without autosave.
- History is not persisted. The sample image is persisted like any other.

## 7. Rendering (react-konva)

- `nodes/Background.tsx` handles every kind. Linear as M1; radial via Konva radial gradient; mesh as a Konva `Shape` whose `sceneFunc` paints the base colour and soft radial blobs straight into the context (resolution independent, exports sharp at any scale); image as cover-fit `Image`; blur pre-rendered on a downscaled offscreen canvas (box blur ×3, cached per source+radius); noise as an overlay `Shape` filling a small generated noise tile pattern at `noise × 0.35` opacity; fromImage from `dominantColors(image)` (pure function on pixel data of a ≤64 px downsample, cached per image id), drawn as a linear gradient; transparent draws nothing and the workspace shows a checkerboard behind the stage.
- `nodes/Shot.tsx` draws the framed shot as a Konva `Group` at the layout's position/rotation: an outer shape (rounded rect, frame/inset fill, carries the shadow — opaque, so the shadow is right), the chrome (title bar, traffic lights, address bar text, Windows buttons) clipped to the outer shape, the inset fill, the screenshot image (inner corners `max(0, radius − inset − ring)`; with frame kind none and inset 0 keep M1's single `Image` with cornerRadius + shadow so transparent PNGs keep their alpha-following shadow), then the border stroke on top. Frame text uses the app font.
- Drag: on fixed canvases the shot group is draggable (stage listens only for this); dragging updates `position` (coalesced into one undo step), with snapping to the canvas centre lines (±6 screen px) and a visible guide while snapped. Arrow keys nudge when the canvas has focus (1 px, Shift 10 px).
- The stage stays `listening={false}` everywhere else; export renders the layer exactly as now.

## 8. UI

- Desktop (≥ 768 px): top bar · icon rail · panel · canvas as in M1. Rail tabs: Background, Frame, Style.
  - Top bar: logo, **size menu** (Auto + presets + Custom W×H with aspect lock), **undo/redo** buttons, Replace image, **theme toggle** (system/light/dark), **Copy**, **Export** (split: main button exports with current options; a popover sets format, quality, scale and file name, shows the output size).
  - Background panel: kind switcher (Gradient, Solid, Mesh, Image, From image, None), then the kind's controls (gradient presets + linear/radial + angle + two stop colours; solid colour; mesh presets; wallpaper grid + Upload image; angle for From image), then Effects (Noise; Blur for image backgrounds).
  - Frame panel: frame kind grid with small previews, theme light/dark, title (macos/windows), URL (browser).
  - Style panel: Padding, Scale (fixed canvas), Position: 9-point align grid (fixed canvas), Rotation, Corner radius, Shadow presets + custom (offset Y, blur, opacity, colour), Border (width, colour, opacity), Inset (size, colour auto/custom), Reset style.
  - Colour fields: `react-colorful` (new dependency, pinned) in a Radix Popover, with a hex input.
- Mobile (< 768 px): compact top bar (logo mark, undo/redo, Export icon button with the same popover), canvas fills the screen, bottom tab bar (Background, Frame, Style, Size) opening a bottom sheet (Radix Dialog styled as a sheet, ~55 % height, canvas visible above). The M1 960 px minimum width and small-screen banner go away.
- Dark mode: `.dark` tokens in `globals.css`; `useTheme` stores system/light/dark in localStorage (try/catch) and sets the class on `<html>`; a tiny inline script in `app/layout.tsx` applies it before first paint. The design canvas itself is unaffected by the theme.
- Shortcuts (`lib/hooks/useShortcuts.ts`, pure matcher in `lib/shortcuts.ts`, unit tested): ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z and Ctrl+Y redo, ⌘/Ctrl+S export, ⌘/Ctrl+Shift+C copy, ⌘/Ctrl+O open the file picker, Delete/Backspace remove the screenshot (undoable), arrows nudge (canvas focused). Ignored while typing in inputs (same editable check as paste). ⌘V paste stays.
- Accessibility as M1: labelled controls, visible opaque focus rings, Radix roles, notices with ids.

## 9. File ownership (parallel phase)

The foundation phase writes `lib/design/*` (schema, sizes, frames, layout, defaults, migrate), `lib/store/editor.ts`, `lib/persist/*`, `lib/export/*` (options, safePixelRatio, filename, clipboard core), `lib/shortcuts.ts`, `lib/image/load.ts` changes, and pre-wires `Editor.tsx`, `ToolRail.tsx`, `TopBar.tsx`, `DesignStage.tsx`, `CanvasViewport.tsx` with stub components so each feature team owns separate files:

| Team | Owns (creates/edits only these) |
|---|---|
| Backgrounds | `lib/design/meshes.ts`, `lib/design/wallpapers.ts`, `assets/wallpapers/*`, `scripts/make-wallpapers.mjs`, `lib/render/*` (mesh, noise, blur), `lib/image/dominantColors.ts`, `components/editor/canvas/nodes/Background.tsx`, `components/editor/panels/BackgroundPanel.tsx`, `components/editor/controls/ColorField.tsx`, their unit tests |
| Frames & style | `components/editor/canvas/nodes/Shot.tsx`, `nodes/Chrome.tsx`, `nodes/Guides.tsx`, `components/editor/panels/FramePanel.tsx`, `panels/StylePanel.tsx`, `controls/AlignGrid.tsx`, `controls/FramePreview.tsx` |
| Export & commands | `components/editor/topbar/*` (SizeMenu, HistoryButtons, ExportMenu, CopyButton), `lib/hooks/useShortcuts.ts`, `lib/hooks/useAutosave.ts`, `lib/export/exportImage.ts` (render/encode changes) |
| Shell | `components/editor/Editor.tsx` layout parts, `components/editor/MobileBar.tsx`, `components/editor/Sheet.tsx`, `components/ui/popover.tsx`, `components/ui/dialog.tsx`, `app/globals.css` dark tokens, `app/layout.tsx` theme script, `lib/hooks/useTheme.ts`, `components/editor/topbar/ThemeToggle.tsx`, removal of `SmallScreenBanner` |

Shared files touched by more than one team are pre-wired in the foundation phase; teams change them only at the marked `// slot:` lines.
