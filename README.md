# Calculus XR Classroom

A mobile-first **WebXR / 3D learning tool** for teaching three calculus &
probability topics. Students scan a QR code, walk around a 3D classroom as a
character, approach boards on the walls, and step through animated explanations
that are **projected onto the wall** — all inside the 3D space, never as a flat
2D page.

Built on **three.js** (the same foundation as Google's
[XR Blocks](https://github.com/google/xrblocks)) using the XR Blocks importmap,
authored in the XR Blocks idiom (a `Script`-style lifecycle and an `Options`
config), with **no build step**. It runs in mobile Safari and Chrome, and in
any desktop browser via the built-in simulator (WASD + mouse-look).

---

## The five interaction points

| Board                       | Section | File (owner)                              |
| --------------------------- | ------- | ----------------------------------------- |
| Linear Approximation        | 1       | `js/stations/linear_approximation.js` (M1) |
| Binomial Distribution       | 2.1     | `js/stations/binomial_and_poisson.js` (M2) |
| Poisson Distribution        | 2.2     | `js/stations/binomial_and_poisson.js` (M2) |
| Normal Distribution         | 3.1     | `js/stations/normal_distribution.js` (M3)  |
| Normal ≈ Binomial           | 3.2     | `js/stations/normal_distribution.js` (M3)  |

---

## File tree

```
xr-calculus/
├── index.html                 # Entry: importmap, viewport, canvas, HUD
├── styles.css                 # All 2D HUD styling (SHARED)
├── README.md                  # This file
└── js/
    ├── main.js                # App bootstrap + render loop (SHARED)
    ├── core/
    │   ├── Options.js         # Central config (XR Blocks idiom) (SHARED)
    │   ├── Room.js            # Classroom: walls, desks, lights (SHARED)
    │   ├── PlayerController.js # Walking character + camera (SHARED)
    │   ├── StationRegistry.js # Modular station registration (SHARED)
    │   ├── WallProjector.js   # Wall-projection text system (SHARED)
    │   ├── TextSprite.js      # Billboard 3D text (SHARED)
    │   └── MathPlot.js        # Graph/curve plotting toolkit (SHARED)
    ├── stations/
    │   ├── BaseStation.js     # Base class for every board (SHARED)
    │   ├── linear_approximation.js  # MEMBER 1
    │   ├── binomial_and_poisson.js  # MEMBER 2
    │   └── normal_distribution.js   # MEMBER 3
    └── ui/
        ├── Joystick.js        # Virtual joystick (SHARED)
        ├── TouchControls.js   # Drag-to-look + interact (SHARED)
        └── Onboarding.js      # First-load overlay (SHARED)
```

---

## (a) How to run locally

Because everything uses native ES modules, you only need a static file server
(opening `index.html` directly via `file://` will **not** work — browsers block
module imports over `file://`).

**Option 1 — Python (already installed on most machines):**

```bash
cd xr-calculus
python3 -m http.server 8080
# open http://localhost:8080
```

**Option 2 — Node:**

```bash
cd xr-calculus
npx http-server -p 8080
# open http://localhost:8080
```

On desktop: click **Enter Classroom**, then use **W/A/S/D** to walk and
**drag the mouse** to look. Walk up to a board and press **E** (or tap
**Interact**) to begin a lesson; **Esc** exits.

To test the phone experience from your computer, open the page on your phone
using your computer's LAN IP (e.g. `http://192.168.1.20:8080`) while both are on
the same Wi-Fi.

---

## (b) Deploy to GitHub Pages (no build step)

1. Create a new repository on GitHub, e.g. `xr-calculus`.
2. Put **the contents** of this folder at the repo root (so `index.html` is at
   the top level), then push:

   ```bash
   cd xr-calculus
   git init
   git add .
   git commit -m "Calculus XR Classroom"
   git branch -M main
   git remote add origin https://github.com/<your-username>/xr-calculus.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Set **Branch** to `main` and **folder** to `/ (root)`. Click **Save**.
6. Wait ~1 minute. Your site will be live at:

   ```
   https://<your-username>.github.io/xr-calculus/
   ```

That URL is what students will scan. No Actions, no bundler, no `npm install`
required — the page pulls three.js / XR Blocks from a CDN at runtime.

> **HTTPS note:** GitHub Pages serves over HTTPS automatically, which is
> required for camera/sensor permissions and WebXR. Good — nothing to configure.

---

## (c) Generate a QR code pointing to the deployed URL

Pick any one:

- **Online (fastest):** go to <https://www.qr-code-generator.com/> or
  <https://goqr.me/>, paste your Pages URL, download the PNG.
- **Command line (qrencode):**

  ```bash
  # macOS:  brew install qrencode
  # Ubuntu: sudo apt install qrencode
  qrencode -o classroom-qr.png "https://<your-username>.github.io/xr-calculus/"
  ```

- **Python:**

  ```bash
  pip install qrcode[pil]
  python3 -c "import qrcode; qrcode.make('https://<your-username>.github.io/xr-calculus/').save('classroom-qr.png')"
  ```

Print `classroom-qr.png` or drop it in a slide. Students scan → the classroom
opens in their phone browser. No app install.

---

## How students use it

1. Scan the QR code; the classroom loads.
2. An onboarding card explains controls, then fades after ~5 seconds.
3. **Joystick (bottom-left)** to walk; **drag anywhere** to look around.
4. Walk toward any board. When close, an **Interact** button appears
   (bottom-right) and a hint shows the topic name.
5. Tap **Interact**. The explanation is **projected on the wall** beside the
   board, and the graph animates.
6. **Next / Prev** step through the explanation; the graph and the wall
   projection update together. **Exit** frees you to walk to another board.

---

## Team workflow (why the files are split this way)

The three section files are fully independent. A member can edit **only their
file** without touching shared code or another member's file:

- **Member 1** edits `js/stations/linear_approximation.js`.
- **Member 2** edits `js/stations/binomial_and_poisson.js`.
- **Member 3** edits `js/stations/normal_distribution.js`.

Each file registers its station(s) through `StationRegistry`, so adding,
removing, or rewording steps in one section cannot break another. The shared
core (room, movement, UI, plotting, wall projector) is stable infrastructure
nobody needs to edit for normal section work.

### How to author a step (for section owners)

Extend `BaseStation` and implement two methods:

```js
buildGraph(plot) {
  // draw the STATIC parts of your graph once (axes/grid are already added)
  plot.plotFunction(x => x * x, { color: 0x4cc9f0, dynamic: false });
}

defineSteps() {
  return [
    {
      board: {                       // <- text shown on the WALL PROJECTION
        title: "My step title",
        accent: "#4cc9f0",
        body: ["line 1", "P(X=k) = ...", "line 3"],
      },
      enter(plot) {                  // <- animate the graph for this step
        plot.marker(1, 1, { color: 0xf72585 });   // pulsing point
        plot.segment(0, -1, 3, 5, { color: 0xffd166 }); // a line
        plot.bar(2, 0.3, { color: 0x4cc9f0 });     // a histogram bar
      },
    },
  ];
}
```

`MathPlot` helpers available to every section:
`plotFunction(fn, opts)`, `segment(x0,y0,x1,y1,opts)`, `bar(x,y,opts)`,
`marker(x,y,opts)`, `clearDynamic()`, plus `toLocal(x,y)` for custom geometry.
The math-to-3D mapping is documented inline in `js/core/MathPlot.js` and in
each station file.

---

## A note on XR Blocks

The brief specified the XR Blocks importmap and CDN, which `index.html`
includes. This project is authored against **plain three.js** — XR Blocks' own
foundation — so the QR-code phone use-case is reliable with zero build step and
no headset requirement. The `xrblocks` module remains available through the
importmap, so the project can be progressively enhanced with native WebXR / hand
tracking when run on Android XR hardware (Chrome 136+). For the classroom phone
scenario this hybrid gives the best of both: XR Blocks compatibility plus
universal mobile-browser support.

---

## Tech notes

- **No hover interactions** — everything is tap/drag, sized for a 6-inch screen.
- **Wall projection** text is high-contrast emissive canvas, readable from any
  angle and under any lighting.
- **Performance:** device pixel ratio is capped at 2, geometry is light, and
  text is rendered to cached canvas textures (re-rendered only on step change).
- **Coordinate axes** on every graph: X red, Y green, Z blue (small, for
  orientation), per the brief.
```
