# Raw Blocks AI — B-Roll Footage Generator

**Raw Blocks AI** generates short, cinematic b-roll clips for product marketing videos. Instead of trying to build a complete edited video from scratch, it generates the raw material — the 2–5 second product flashes, close-ups, texture shots, and reveal moments that editors cut into larger pieces.

---

## What is B-Roll?

B-roll is the supplemental footage that cuts away from the main shot. In product videos it shows up as:

- A 1-second flash of the product sitting on a surface
- A close-up of a button being pressed or a lid being opened
- A macro shot of the product's texture or finish
- A hand reaching in to grab the product
- A beauty shot of packaging catching light

These clips are the raw inventory of a video editor. You don't watch them alone — you cut to them.

---

## Why B-Roll (Not Full AI-Generated Videos)?

Current AI video generation (Veo, Runway, Sora) is impressive but has a specific weakness: **it cannot reliably reproduce a specific product**. If you give it a reference image of your exact blender — matte black, specific logo placement, particular handle shape — it will approximate. It hallucinates details, changes colors, ignores branding constraints. Generating 6 clips that all look like the *same* product is essentially unsolvable at production quality today.

B-roll sidesteps this problem:

- Each clip is **standalone** — no cross-clip product consistency required
- Focus is on **motion, light, and atmosphere** rather than exact product reproduction
- 2–5 second duration = simpler prompt = more reliable output
- Editors pick what works; nothing is wasted

---

## How It Works

1. **Input**: Paste a product URL and a reference video URL
2. **Agent Research**: The team analyzes the product — features, visual DNA, pain points, target audience
3. **B-Roll Shot Planning**: The Director designs a library of short footage moments mapped to the product
4. **Generation**: Each shot is sent to Runway for video generation (requires Runway API key)
5. **Library**: Download individual clips and cut them into your edit

---

## Agent Team

| Agent | Role |
|---|---|
| Researcher | Extracts product visual DNA, features, and reference footage |
| Strategist | Maps shots to buyer psychology and platform requirements |
| Director | Designs the b-roll shot library — what moments to capture |
| QA | Checks shot plans for brand alignment and visual accuracy |
| Video Editor | Assembles final shot list and generates Imagen reference frames |

---

## Setup

1. Clone the repo and run `npm install`
2. Copy `.env.example` to `.env` and fill in your API keys
3. Run `npm run dev`
4. Paste a product URL and reference video, then hit **Start Agents**

Required API keys:
- `VITE_GEMINI_API_KEY` — for the agent research pipeline
- `VITE_RUNWAY_API_URL` + `VITE_RUNWAY_API_KEY` — for video generation (optional; prompts work without it)

---

*Build a footage library, not a finished video.*
