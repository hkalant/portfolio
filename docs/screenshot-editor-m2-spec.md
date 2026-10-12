# Milestone 2 build spec

The shared contract for milestone 2 ("Full styling" in [the product plan](screenshot-editor-plan.md)). Paths are relative to `apps/screenshot-editor/`.

**In scope:**
- size presets and custom sizes;
- every background kind, with noise and blur;
- window and browser frames, border and inset;
- scale, position, alignment, drag and rotation;
- copy to clipboard;
- JPEG and WebP export at 1× to 4×;
- undo and redo, autosave and restore, keyboard shortcuts;
- mobile layout, light and dark interface, "Reset style".

**Out of scope:**
- text, annotations, watermark and templates (M3);
- device mockups, multiple images and 3D (M4 and M5).

**Rules that don't change:**
- The app stays a client-only static export with no server features.
- Every runtime URL respects the base path.
- M1 behaviour keeps working: its unit and e2e tests stay green, or are changed on purpose.
- Versions stay pinned. ESLint 9 and TypeScript 5.9 run through the npm scripts. Prettier formats everything. No `next/font/google`.
- **Storage names are namespaced.** Every app under `<workspace>.bitbucket.io` shares one browser origin. So the IndexedDB database is named `screenshot-editor`, and localStorage keys start with `screenshot-editor:`.

## 1. Design model v2 (`lib/design/schema.ts`)

```ts
Design = {
  version: 2;
  canvas: CanvasSpec;
  background: Background;
  backgroundFx: { noise: number /* 0..1 */; blur: number /* 0..40, image backgrounds only */ };
  layers: [ShotLayer];             // still exactly one layer
};

CanvasSpec =
  | { preset: "auto" }                                        // canvas = framed shot + 2 × padding
  | { preset: SizePresetId; width: number; height: number }   // copied from lib/design/sizes.ts
  | { preset: "custom"; width: number; height: number };      // whole numbers, 100..4000 per side

Background =
  | { kind: "solid"; color: Hex }
  | { kind: "linear"; presetId: string | null; angle: number; stops: Stop[] }   // M1 shape
  | { kind: "radial"; presetId: string | null; stops: Stop[] }                  // centred, reaches the farthest corner
  | { kind: "mesh"; presetId: string }                                          // lib/design/meshes.ts
  | { kind: "image"; source: { type: "upload"; imageId: string } | { type: "wallpaper"; wallpaperId: string } }
  | { kind: "fromImage"; angle: number }   // linear gradient of the screenshot's own colours, worked out when drawn
  | { kind: "transparent" };

ShotLayer = {
  id; kind: "shot"; imageId: string | null;
  padding: number;                    // whole numbers 0..200: framed shot to canvas edge
  scale: number;                      // 0.2..1.5; fixed canvases only (auto ignores it)
  position: { x: number; y: number }; // centre of the framed shot, 0..1 of the canvas; fixed canvases only
  rotation: number;                   // whole degrees, -45..45, about the shot's centre
  radius: number;                     // 0..64, outer corner radius
  shadow: ShadowSpec;                 // M1 shape; the preset can also be "custom"
  border: { width: number /* 0..24 */; color: Hex; opacity: number /* 0..1 */ };
  inset: { size: number /* 0..64 */; color: Hex | "auto" };   // "auto" = the screenshot's edge colour
  frame: { kind: FrameKind; theme: "light" | "dark"; title: string; url: string };  // texts ≤ 120 chars
};

FrameKind = "none" | "macos" | "browser" | "windows" | "minimal" | "glass";
```

**Units:**
- Radius, border width, shadow and padding are canvas pixels. They are never multiplied by the shot's scale.
- Inset, frame chrome and the glass ring are part of the shot's geometry, so they scale with it.

**Shadow presets:**
- `ShadowPresetId` gains `"custom"`.
- Choosing a preset copies its values. Editing any value sets the preset to `"custom"`.
- The "None" preset, or opacity 0, means no shadow.

**Migration:** `migrateDesign(unknown): Design | null`.
- It accepts v1 (the M1 shape) and v2, and returns `null` for anything invalid.
- New fields get their defaults.

**Defaults:** `createDefaultDesign()` gives:
- canvas auto;
- the M1 default gradient;
- noise 0, blur 0;
- padding 64, scale 1, position centre, rotation 0, radius 12;
- shadow medium;
- border 0 (#ffffff at 0.6);
- inset 0 (auto);
- frame none, light, empty title and URL.

`defaultShotStyle()` returns the style fields alone, for "Reset style".

**Referenced images:** `referencedImageIds(design)` lists the screenshot and the uploaded background. It lives in `lib/design/refs.ts`.

## 2. Presets and geometry

- **`lib/design/sizes.ts`** (done): `SIZE_PRESETS`, `CUSTOM_SIZE` 100..4000 and `aspectLabel`.
- **`lib/design/frames.ts`:**
  - `FRAME_KINDS` and `FRAME_LABELS`.
  - `frameMetrics(kind, imageWidth)` returns `{ chromeTop, ring, unit }` in natural design px. `unit = clamp(imageWidth / 1000, 0.6, 1.6)`, so a frame looks the same on any screenshot size.
  - Base sizes, all multiplied by `unit` and rounded:

    | Frame | Title bar (`chromeTop`) | Ring |
    |---|---|---|
    | macos | 34 | – |
    | windows | 34 | – |
    | browser | 48 | – |
    | minimal | 22 | – |
    | glass | – | 16 |
    | none | 0 | 0 |

  - Chrome drawing details (traffic lights, address bar) belong to the frame renderer and scale by `unit`.
- **`lib/design/meshes.ts`:** about 8 presets, each `{ id, name, base, blobs: { x, y, r, color }[] }`. Positions and radii are fractions of the canvas.
- **`lib/design/wallpapers.ts`:** about 6 built-in wallpapers, `{ id, name, draw(ctx, w, h) }`.
  - They are drawn by code, with seeded randomness and no image files.
  - Each is rendered once into a 2400 × 1500 canvas, cached, and then used like an uploaded background.

## 3. Layout v2 (`lib/design/layout.ts`)

`computeLayout(source: Size, design: Design): DesignLayout`. Everything is in canvas px. The rects are relative to the shot's top-left corner.

```ts
DesignLayout = {
  canvas: Size;                 // whole numbers
  draggable: boolean;           // fixed canvases only
  shot: {
    x, y, width, height;        // top-left before rotation, and size after scaling
    scale; rotation;
    radius;                     // min(shot.radius, width / 2, height / 2)
    image: Rect;                // the screenshot
    imageRadii: [tl, tr, br, bl]; // max(0, radius − (inset + ring) × scale); top corners 0 under a title bar
    content: Rect;              // inset area around the image (equals image when inset is 0)
    chrome: Rect | null;        // title or address bar
  };
};
```

**Natural framed shot:**
- `image = fitWithin(source, 1600)`.
- Width = image.width + 2 × inset + 2 × ring.
- Height = image.height + 2 × inset + 2 × ring + chromeTop.
- Order from the outside in: ring, then the title bar at the top, then the inset, then the image. The border is drawn inside the outer edge and adds no size.

**Auto canvas:**
- Scale is 1.
- Canvas = round(natural + 2 × padding).
- The shot sits at (padding, padding).

**Fixed canvas:**
- Available space = max(1, canvas − 2 × padding).
- `scale = min(available.w / natural.w, available.h / natural.h) × shot.scale`.
- The shot is centred on `position × canvas`.

`fitWithin`, `computePreviewScale` and `scaleSize` stay as they are. Everything is pure and unit tested.

## 4. Store (`lib/store/editor.ts`), the only place that changes the design

**History.** The store keeps its own history, with no library.
- `past` and `future` are `Design[]`, each limited to 100 entries.
- Every design change goes through `commit(recipe, key?)`. A commit that changes nothing is ignored, compared as JSON.
- **Merging steps:** if `key` matches the previous commit's key and that commit was under 1000 ms ago, the present design is replaced without a new history step. Slider drags, typing and nudges become one undo step.
- `sealHistory()` ends the current merge, for example when a slider is released.
- A new commit clears `future`.
- **Image limit:** history may refer to at most 5 distinct images, counting past, present and future. If a commit goes over, the oldest `past` entries are dropped until it fits.
- `undo()` and `redo()`; `canUndo` and `canRedo` are true when `past` or `future` is not empty.
- `revision` goes up by one with every change to the design (commit, undo, redo, load).
- `setImage` and `clearImage` are undoable.

**Images.** `pruneImages()` keeps every image that any design in past, present or future refers to (`referencedImageIds`).

**Design actions.** All of them clamp and round like M1, and ignore unknown ids and invalid values.
- **Images:** `setImage(image)`, `clearImage()`, `setBackgroundImage(image)`.
- **Background:** `setBackground(bg)`, `applyGradientPreset(id)`, `setGradientKind("linear" | "radial")`, `setGradientAngle(deg)`, `setGradientStop(index, color)`, `setSolidColor(hex)`, `applyMeshPreset(id)`, `setWallpaper(id)`, `setFromImage()`, `setFromImageAngle(deg)`, `setTransparent()`, `setNoise(n)`, `setBlur(px)`.
- **Canvas:** `setCanvasPreset(id | "auto")`, `setCustomSize(w, h)`.
- **Placement:** `setPadding`, `setScale`, `setPosition(x, y)`, `nudge(dx, dy)` (canvas px, fixed canvases), `alignTo(h, v)` (each `"start" | "center" | "end"`; the shot's unrotated edges line up with the padding), `setRotation`.
- **Style:** `setRadius`, `setShadowPreset(id)`, `setShadow(patch)` (sets the preset to "custom"), `setBorder(patch)`, `setInset(patch)`, `setFrame(patch)`.
- **Reset and restore:**
  - `resetStyle()` puts the shot style back to `defaultShotStyle()`. It keeps the image, canvas and background, and is undoable.
  - `loadDesign(design, images)` restores an autosave and clears history.

**UI state, kept out of history:**
- `activePanel` (`"background" | "frame" | "style"`) and `mobilePanel` (`PanelId | "size" | null`);
- `loading`, `restoring`, `exporting`;
- `notice` (it gains `kind: "info"` for success messages);
- `exportOptions` with `setExportOptions(patch)`.

**Selectors.**
- `selectShot` and `selectActiveImage` keep working. Add `selectBackgroundImage`.
- `useDesignLayout()` (`lib/store/hooks.ts`) memoises `computeLayout` from the design and the screenshot. Selectors must return stable references.

**`LoadedImage`** gains `blob` (the original file, for autosave). `loadImageFromBlob(blob, name, { id })` takes a fixed id when restoring.

**Ingest.** `ingestFile(file, target = "shot" | "background")` keeps a separate "newest attempt wins" counter for each target.

## 5. Export (`lib/export/*`)

**Options:**
- `ExportOptions` (done): format png, jpeg or webp; quality 0.5..1; scale 1–4. Default PNG 2×.
- They are remembered in localStorage under `screenshot-editor:export-options`, and read through `sanitizeExportOptions`.

**Size and file name:**
- `safePixelRatio` (done) caps the pixel ratio. The UI shows the real output size and says when it was capped.
- `exportFilename(source, scale, now, extension)`: the extension follows the format.

**Encoding:**
- JPEG has no alpha. The layer canvas gets white painted under it (`destination-over`) for JPEG only, with no second canvas.
- **Copy:** `navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })])`. It is created synchronously inside the click or keydown handler (the promise form keeps Safari happy). It always copies PNG at the current scale.
  - Success shows the info notice "Copied to clipboard".
  - Failure shows "Couldn't copy the image. Use Export instead."

**M1 guarantees still hold:**
- the render happens after a paint;
- export is refused while loading;
- the output is exactly `floor(w × ratio) × floor(h × ratio)`;
- the layer is rendered at true size whatever the zoom;
- `document.fonts.ready` is awaited when a frame draws text.

**Export button name:** it follows the options, for example "Export PNG 2×", so the M1 tests keep their selector.

## 6. Persistence (`lib/persist/*`)

**Storage:**
- IndexedDB through `idb-keyval` (pinned), with `createStore("screenshot-editor", "autosave")`.
- Keys: `design` holds `{ design, savedAt }`. `image:<id>` holds `{ blob, name }` for each image the present design refers to.
- Each image is written once per id. Image keys the design no longer uses are deleted.

**`useAutosave()`:**
- Saves 600 ms after the last change to `revision`.
- On first mount it restores before the empty state appears, setting `restoring` (the editor shows "Restoring your last design…").
- Missing images fall back: no screenshot, or the default background.
- A restore is skipped if the user changed anything while it ran (`revision` moved).

**Failure handling:** IndexedDB that is missing or failing (private windows, quota) never breaks the editor and logs no console errors. Autosave just turns itself off.

History isn't persisted. The sample image is saved like any other image.

## 7. Rendering (react-konva)

**`nodes/Background.tsx`** handles every kind:
- **linear:** as in M1.
- **radial:** a Konva radial gradient.
- **mesh:** a `Shape` whose `sceneFunc` paints the base colour, then soft radial-gradient blobs. It stays sharp at any export scale.
- **image:** a cover-fit `Image`.
- **blur:** pre-rendered by downscaling, three box-blur passes, then drawing scaled up. It is cached per source and radius.
- **noise:** a `Rect` with a cached 128 px noise tile as its pattern, at opacity `noise × 0.35`.
- **fromImage:** a linear gradient from `dominantColors(image)`.
- **transparent:** draws nothing. The workspace shows a checkerboard behind the stage.

**`lib/image/colors.ts`:**
- `dominantColors(pixels)` and `edgeColor(pixels)` are pure functions over RGBA data from a ≤ 64 px downsample.
- `sampleImagePixels(source)` makes that downsample, cached per source.

**`nodes/Shot.tsx`** draws the framed shot as a `Group`, rotated about its centre. In order:
1. The outer rounded shape. It is opaque and carries the shadow.
2. The title bar, clipped to the outer shape.
3. The inset fill.
4. The image, with `imageRadii`.
5. The border stroke on top.

Two special cases:
- With frame "none" and no inset, it keeps M1's single `Image` with `cornerRadius` and shadow, so a transparent PNG's shadow still follows its alpha.
- Glass: the ring is translucent and casts no shadow; the content casts it.

Frame text uses Inter, loaded first through `document.fonts.load`, and the layer is redrawn once the font is ready.

**Drag:**
- On fixed canvases only the shot group listens and can be dragged. Dragging updates `position` as one undo step.
- It snaps to the canvas centre lines within 6 screen px, and shows a guide line while snapped.
- Arrow keys nudge while the canvas is focused: 1 px, or 10 px with Shift.

Export renders the layer exactly as in M1. Guides are hidden during export.

## 8. UI

**Desktop (≥ 768 px):** top bar · icon rail · panel · canvas, as in M1. The rail has Background, Frame and Style.
- **Top bar:**
  - logo;
  - **size menu:** Auto, the presets, and Custom W × H with an aspect lock;
  - **undo and redo**;
  - Replace image;
  - **theme toggle:** system, light or dark;
  - **Copy**;
  - **Export:** the main button exports with the current options. A popover beside it sets format, quality and scale, and shows the output size.
- **Background panel:**
  - kinds: Gradient, Solid, Mesh, Image, From image, None;
  - each kind's controls:
    - Gradient: presets, linear or radial, angle, two stop colours;
    - Solid: a colour;
    - Mesh: presets;
    - Image: the wallpaper grid and Upload;
    - From image: an angle;
  - Effects: noise, and blur for image backgrounds.
- **Frame panel:** a grid of frame kinds with small previews, light or dark theme, title (macOS and Windows), URL (browser).
- **Style panel:**
  - padding;
  - scale and a 9-point align grid (fixed canvases only);
  - rotation;
  - corner radius;
  - shadow presets, plus custom values: offset Y, blur, opacity, colour;
  - border: width, colour, opacity;
  - inset: size, and colour (auto or custom);
  - Reset style.
- **Colour fields:** `react-colorful` (pinned) in a Radix Popover, with a hex text input (`controls/ColorField.tsx`).

**Mobile (< 768 px):**
- A compact top bar: logo mark, undo and redo, an Export icon with the same popover.
- The canvas.
- A bottom tab bar (Background, Frame, Style, Size). It opens a panel docked under the canvas, about 45 % of the height; the canvas shrinks to the space above it. Tapping the active tab closes the panel.
- The M1 960 px minimum width and the small-screen banner go away.

**Dark mode:**
- `.dark` tokens in `globals.css`.
- `useTheme` stores system, light or dark in localStorage (`screenshot-editor:theme`, inside try/catch) and sets the class on `<html>`.
- An inline script in `app/layout.tsx` applies it before the first paint.
- The design canvas itself never changes with the theme.

**Shortcuts** (`lib/shortcuts.ts` is the pure matcher; `lib/hooks/useShortcuts.ts` wires it up):

| Keys | Action |
|---|---|
| ⌘/Ctrl+Z | undo |
| ⌘/Ctrl+Shift+Z, Ctrl+Y | redo |
| ⌘/Ctrl+S | export |
| ⌘/Ctrl+C (no text selected), ⌘/Ctrl+Shift+C | copy |
| ⌘/Ctrl+O | open the file picker |
| Delete, Backspace | remove the screenshot (undoable); only when the page or the canvas has focus |
| arrows, Shift+arrows | nudge, when the canvas has focus |

All shortcuts are ignored while typing (the same editable check as paste). ⌘V paste stays.

**Accessibility,** as in M1: labelled controls, visible focus rings, Radix roles, notices with ids. Icon-only buttons have an `aria-label` and a `title`.

## 9. Who owns which files during the parallel phase

**Built in the foundation phase:**
- `lib/design/*`, `lib/store/*`, `lib/persist/*`, `lib/export/*`, `lib/shortcuts.ts`;
- `lib/image/{load,ingest,colors}.ts`;
- `components/ui/popover.tsx`, `controls/ColorField.tsx`;
- `Editor.tsx`, `ToolRail.tsx`, `TopBar.tsx`, `DesignStage.tsx` and `CanvasViewport.tsx`, already connected to stub components.

**Then each team creates or edits only its own files:**

| Team | Owns |
|---|---|
| Backgrounds | `lib/design/{meshes,wallpapers}.ts`, `lib/render/*` (mesh, noise, blur), `nodes/Background.tsx`, `panels/BackgroundPanel.tsx`, and their unit tests |
| Frames and style | `nodes/{Shot,Chrome,Guides}.tsx`, `panels/{FramePanel,StylePanel}.tsx`, `controls/{AlignGrid,FramePreview}.tsx` |
| Export and commands | `components/editor/topbar/{SizeMenu,HistoryButtons,ExportMenu,CopyButton}.tsx`, `lib/hooks/{useShortcuts,useAutosave}.ts`, `lib/export/exportImage.ts` |
| Shell | the layout parts of `Editor.tsx`, `MobileBar.tsx`, `MobilePanel.tsx`, `app/globals.css` dark tokens, the `app/layout.tsx` theme script, `lib/hooks/useTheme.ts`, `topbar/ThemeToggle.tsx`, removing `SmallScreenBanner` |
