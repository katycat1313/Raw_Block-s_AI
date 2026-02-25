# 8-Second Video Prompt Library

Purpose: Short, specific prompts to generate 8-second clips. Each prompt follows a clear structure agents can adapt: Objective | Duration | Shot list | Visual style | Camera & framing | Primary actions (start→end) | Audio & text overlays | Tone.

Template:
- Objective: [What the clip must show]
- Duration: 8s
- Shots: [1–3 concise shot descriptions with timestamps]
- Setting & props: [brief]
- Camera & framing: [e.g., close-up, top-down, 3/4]
- Action sequence (0–8s): [frame-by-frame key actions]
- Audio: [ambient, voiceover snippet, SFX, music mood]
- Text / CTA: [on-screen captions, timing]
- Visual style & color grade: [e.g., bright, moody, high-contrast]

Examples

1) How-to (Simple tutorial)
- Objective: Show a quick 3-step how-to for brewing pour-over coffee.
- Duration: 8s
- Shots:
  - 0.0–2.5s: close-up of kettle pouring (slow motion)
  - 2.5–5.0s: top-down of spiral pour over grounds
  - 5.0–8.0s: close-up of cup being placed on table, steam rising
- Setting & props: kitchen counter, gooseneck kettle, dripper, cup
- Camera & framing: close-up and top-down, smooth transitions
- Action sequence: start: kettle lift → pour spiral → place cup, steam
- Audio: soft upbeat music, faint kettle SFX, 1-s VO caption "Pour in a slow spiral"
- Text / CTA: 0.5s caption "Step 1" at 0–2.5s, "Step 2" at 2.5–5s, "Enjoy" at 5–8s
- Style: warm, natural light, shallow depth of field

Final prompt example (single-line agent-ready):
"8s how-to: pour-over coffee. 0–2.5s close-up slow-mo kettle pouring; 2.5–5s top-down spiral pour over grounds; 5–8s close-up cup placed, steam rising. Bright kitchen, gooseneck kettle, dripper. Camera: smooth close-ups/top-down, shallow DOF. Audio: upbeat ambient, kettle SFX, VO 'Pour in a slow spiral' at 1s. On-screen captions: Step 1/Step 2/Enjoy timed to shots. Warm color grade."

2) Unboxing
- Objective: Quick product unboxing reveal emphasizing first impressions.
- Duration: 8s
- Shots:
  - 0.0–1.5s: box on table, hands entering frame
  - 1.5–4.0s: top-down opening, peel seal, lift lid
  - 4.0–8.0s: reveal product close-up with badge/brand
- Setting & props: neutral table, branded box, minimal background
- Camera: top-down to close-up, steady gimbal
- Action: hands open → remove insert → reveal product and logo
- Audio: crisp paper SFX, single upbeat hit at reveal, soft ambient
- Text: 4.5s overlay "First look" when product appears
- Style: clean, high-contrast, true colors

Final prompt example:
"8s unboxing: neutral table top-down. 0–1.5s box with hands; 1.5–4s peel seal and lift lid; 4–8s product reveal close-up showing brand. Use crisp paper SFX, reveal hit at 4s, 'First look' overlay at 4.5s. Clean lighting, high-contrast colors."

3) Troubleshooting (Quick fix)
- Objective: Show a 3-step quick fix for a printer paper jam.
- Duration: 8s
- Shots:
  - 0.0–2.5s: close-up of printer error light and jammed paper
  - 2.5–5.5s: hands carefully remove paper following feed path
  - 5.5–8.0s: printer ready light on, thumbs-up
- Setting: office desk, printer model visible
- Camera: close-ups on hands and printer internals
- Action: spot error → clear jam by pulling along feed → show ready light
- Audio: subtle mechanical clicks, 1-s calm VO "Pull along the feed"
- Text: captions for each step at corresponding timestamps
- Style: neutral, instructional clarity

Final prompt example:
"8s troubleshooting: printer paper jam fix. 0–2.5s error light and jam close-up; 2.5–5.5s hands pull paper along feed path; 5.5–8s ready light and thumbs-up. Office setting, clear close-ups. Audio: mechanical SFX, VO 'Pull along the feed' at 3s. Step captions matched to shots."

4) Comparison (Side-by-side)
- Objective: Showcase two phones' camera low-light shot results.
- Duration: 8s
- Shots:
  - 0.0–1.0s: title card "Low-light camera comparison"
  - 1.0–4.0s: split-screen A (left) showing phone A sample
  - 4.0–7.0s: split-screen B (right) showing phone B sample, then quick swipe
  - 7.0–8.0s: verdict badge "Cleaner: Phone B"
- Setting: identical sample scene photos
- Camera: split-frame, equal sizing, static
- Action: present sample A then B with subtle zoom differences
- Audio: neutral ambience, single ding at verdict
- Text: percentage or short caption overlay for each side
- Style: clinical, direct comparison color-matched

Final prompt example:
"8s comparison: low-light camera A vs B. 0–1s title 'Low-light camera comparison'; 1–4s left=A sample; 4–7s right=B sample; 7–8s verdict badge 'Cleaner: Phone B'. Split-screen, matched framing, neutral ambient audio, ding on verdict, captioned scores."

5) Review (Micro review)
- Objective: 8-second micro review highlighting pros and cons of wireless earbuds.
- Duration: 8s
- Shots:
  - 0.0–1.0s: product hero close-up with model name
  - 1.0–3.0s: quick on-ear demo showing fit
  - 3.0–5.5s: text bullets: "Pro: Sound, Battery"
  - 5.5–7.5s: text bullet: "Con: No ANC"
  - 7.5–8.0s: rating badge "4/5"
- Setting: neutral studio, model wearing earbuds
- Camera: mix of close-up and medium on-ear
- Audio: short audio sample clip, soft VO "Great sound, limited ANC"
- Text: bold bullet points timed to segments
- Style: concise, review-style lower-thirds

Final prompt example:
"8s review: wireless earbuds micro review. 0–1s hero close-up with name; 1–3s on-ear fit demo; 3–5.5s show pros 'Sound, Battery'; 5.5–7.5s show con 'No ANC'; 7.5–8s rating '4/5'. Include 2s audio sample, VO 'Great sound, limited ANC'. Clean studio lighting, bold text overlays."

Usage notes:
- Keep verbs concrete and timing explicit (start–end timestamps).
- Limit actions per shot to one clear motion to read well in 8s.
- Prefer simple audio cues and 1–2 short text overlays.
- Agents should substitute product-specific details and brand-safe language as needed.

## Product presentation & reference assets (how agents show the product to the generator)

Purpose: Ensure the generator uses the exact product appearance, branding, and reference footage.

Required assets (always provide):
- Canonical example video URL (primary reference) + required timestamp ranges (e.g., 0:12–0:20).
- 3–5 high-resolution images (front, back, side, in-use) with direct URLs.
- Exact product metadata: product name, model/SKU, color/finish, size/dimensions, variant code.
- License/usage confirmation: short statement that assets may be used for generation.
- Optional: short style notes (e.g., "matte black, silver trim, visible logo top-right").

Hard constraints (must be explicit in prompt):
- No-substitute clause: "Do not replace product color, logo, or brand; do not add other brand markings."
- Visual consistency: require same-looking product across all generated clips.

How to annotate references for prompts:
- Use timestamp format: start–end seconds (e.g., https://…/watch?v=abc 10–18s).
- Visual callouts: list elements that must match (e.g., "retain matte finish, keep logo centered").
- Shot example citations: add short notes like "use 0:12–0:16 for close-up pouring motion."

Minimum prompt snippet pattern to include references:
- Reference: [PRIMARY_VIDEO_URL] (0:10–0:18); Ref images: [IMG_FRONT_URL], [IMG_SIDE_URL].
- Product: Name: "ACME Blender Pro 3000", SKU: ACME-3000-BLK, Color: matte black.
- Constraint: "Use exact product appearance from provided references; do not substitute color or add other logos."

Single-line example (agent-ready):
"Reference: https://example.com/watch?v=abc 12–20s; images: https://…/front.jpg, https://…/side.jpg. Product: ACME Blender Pro 3000, SKU ACME-3000-BLK, color matte black. Constraint: do not change color, logo, or scale. 8s how-to: 0–3s close-up blending, 3–6s pour demo, 6–8s product hero with badge."

Best practices:
- Provide one canonical video and 2–3 supporting references for style and motion.
- Include direct image URLs (not pages) and confirm usage rights.
- Keep constraints short and explicit so the generator enforces visual consistency.
- When generating multiple 8s clips, include a master reference block so all clips use the same product assets.

---

## Agent orchestration: roles, workflow, handoffs, and buyer-stage targeting

Purpose: Define a repeatable team flow so agents research, communicate, and produce consistent 8s clip prompt packages that align to buyer stage and pass director QA.

Roles & responsibilities
- Director / Overseer: final approvals, assigns product + buyer-stage target, enforces brand constraints.
- Assistant PM: compiles research into the Master Reference Block, tracks versions, coordinates handoffs.
- Researcher: finds canonical video frames, supporting clips, direct image URLs, timestamps, competitor references, and short style notes.
- Social Media Agent: maps clips to platform/format, writes CTAs and caption variants, advises on buyer-stage messaging.
- Sound & Graphics Agent: provides audio specs, SFX cues, VO text, lower-thirds and badge designs, color-grade guidance.
- Video Editor: assembles/exports test renders, confirms cut timings, confirms final clips match prompts.
- QA / Compliance (can be Director): checks brand, licensing, and "no-substitute" constraints.

High-level workflow (step-by-step)
1. Intake (Director) — product name, SKU/variant, canonical video URL, buyer-stage target (Awareness/Consideration/Decision).
2. Researcher — create Master Reference Block: extract frames, timestamps, metadata, and candidate supporting refs.
3. Assistant PM — compile Prompt Package skeleton with Master Reference Block and clip objectives.
4. Prompt Agent — draft 3–6 prompt variants per objective including shot timings, audio cues, on-screen text, and hard constraints.
5. Sound & Graphics — provide SFX timings, VO scripts, font/style tokens, badges and color-grade sample.
6. Editor — assemble rough renders from assets and prompts; export proofs for QA.
7. QA (Director) — verify product appearance, licensing, buyer-stage messaging; approve or request fixes.
8. Social Media — adapt final clips for platforms, captions, and run tests.

Handoff artifacts (must accompany each stage)
- Master Reference Block, Prompt Package, Asset Manifest, Sound/Graphics Pack, Edit Notes / Rough Renders, QA Checklist & approval.

Buyer-stage mapping (clip goals & CTAs)
- Awareness: hook + hero; CTA "Learn more".
- Consideration: feature demo/comparison; CTA "Compare specs".
- Decision: unboxing/review/promo; CTA "Buy now".

Prompt naming & versioning
- Format: Product_SKU_Stage_ClipType_v01 (e.g., ACME-3000-BLK_Decision_Unbox_v01).

Prompt & asset rules (enforced)
- Master Reference Block required before finalizing prompts.
- Include explicit "No-substitute" statement.
- Keep duration strict to 8.0s and list precise shot timings.
- Provide direct asset URLs and license confirmation.

QA checklist (quick)
- Visual match, timing, text legibility, audio, legal/licensing, branding, Director sign-off.

Communication templates (short)
- Researcher -> Assistant PM: concise MasterRef summary line.
- Assistant PM -> Prompt Agent: instructions referencing MasterRef and required variants.
- Prompt Agent -> Sound/Graphics: SFX/VO requests with timings.

Acceptance criteria
- Master Reference Block present, prompts include MasterRef citation and "No-substitute" clause, at least 3 variants for A/B, editor can assemble an 8s draft without extra direction, QA green before publish.

---

## Reference discovery rules — researcher workflow when only one canonical URL is provided

Purpose: The user supplies a single canonical video URL. The Researcher must use that seed to find additional matching product videos/images so all generated clips use the exact same product appearance.

Required seed usage
- Treat the user-provided URL as the canonical seed and build all search/matches from frames, metadata, and visible markings in that video.
- Do not substitute product variants unless authorized by the Director.

Researcher flow (concise)
1. Capture visual fingerprint: extract 3–5 frames (hero, logo close-up, packaging, distinguishing mark).
2. Extract metadata: uploader, title, description, tags.
3. Search: reverse-image frame search, site queries using model/SKU and color, marketplace/retailer listings.
4. Verify candidates: logo, color/finish, distinguishing features, printed text/SKU on box.
5. Metadata check: prefer candidates with SKU/model in title/description and credible uploader.
6. Confidence scoring: High/Medium/Low with justification; log source URL, timestamp, and checks passed/failed.
7. Asset selection rules: require at least 2 High or 1 High + 2 Medium supporting candidates before finalizing.
8. Deliverables: updated Master Reference Block (seed, frames, supporting URLs with timestamps, confidence scores) and a short ambiguity note if needed.
9. Tools (recommended) — ffmpeg frame extraction example (Mac):
   - ffmpeg -i canonical.mp4 -ss 00:00:04 -vframes 1 frame_logo.jpg
10. QA gating: Assistant PM reviews logs; Director approves Medium/Low candidate use.

Minimum acceptance before prompt generation
- Master Reference Block with seed, 3–5 frames, at least 2 supporting video URLs with timestamps, and confidence justification; no unresolved contradictions about color/logo/SKU without Director approval.

Example researcher log line:
"Seed: https://…/watch?v=abc (0:12 logo close-up). Frames: frame_hero.jpg, frame_logo.jpg. Candidates: https://…/v1 (High: logo+SKU+color), https://…/v2 (Medium: logo+color only). Final: use v1+v2 (v2 flagged for trim mismatch). Confidence: High."

//

// ...existing code...

// ...existing code...

## Integration: calling veo-3.1-fast-generate-001, async generation, and robust error handling

Purpose: Ensure agents call veo-3.1-fast-generate-001 reliably, pass the precise prompts (Master Reference Block + clip specs), and that the system handles failures and long-running jobs without blocking agents.

Model id (exact)
- Use: "veo-3.1-fast-generate-001"

Required request fields (enforce in code)
- master_reference_block: { canonical_url, image_urls[], timestamps[], sku, license_statement }
- prompt_package: full agent prompt (include "No-substitute" clause)
- clip_spec: { duration: 8.0, shots: [...] }
- assets_manifest: [ direct URLs ]
- metadata: { product_sku, agent_id, buyer_stage, idempotency_key, model: "veo-3.1-fast-generate-001" }

Example JSON payload (minimal)
```json
{
  "model": "veo-3.1-fast-generate-001",
  "master_reference_block": {
    "canonical_url": "https://.../watch?v=abc",
    "image_urls": ["https://.../front.jpg"],
    "timestamps": ["0:12-0:20"],
    "sku": "ACME-3000-BLK",
    "license": "licensed-by-client"
  },
  "prompt_package": "8s how-to: ... (include 'No-substitute' clause)",
  "clip_spec": { "duration": 8.0, "shots": [ { "start": 0, "end": 2.5, "action": "close-up pour" } ] },
  "assets_manifest": ["https://.../overlay.png"],
  "metadata": { "product_sku": "ACME-3000-BLK", "buyer_stage": "Consideration", "idempotency_key": "uuid-v1", "model": "veo-3.1-fast-generate-001" }
}
```

Invocation notes, error handling, async patterns, and acceptance criteria remain the same — just ensure the model id matches exactly in all code and examples.

After replacement, rerun the grep command above to verify only the intended Integration block(s) remain and the model id is correct. If you want, I can produce a small sed/awk one-liner to remove duplicate Integration blocks and keep the corrected one — tell me to proceed.// filepath: /Users/katycat/github-repo's/Raw_Block-s_AI/8s_video_prompts.md
// ...existing code...

## Integration: calling veo-3.1-fast-generate-001, async generation, and robust error handling

Purpose: Ensure agents call veo-3.1-fast-generate-001 reliably, pass the precise prompts (Master Reference Block + clip specs), and that the system handles failures and long-running jobs without blocking agents.

Model id (exact)
- Use: "veo-3.1-fast-generate-001"

Required request fields (enforce in code)
- master_reference_block: { canonical_url, image_urls[], timestamps[], sku, license_statement }
- prompt_package: full agent prompt (include "No-substitute" clause)
- clip_spec: { duration: 8.0, shots: [...] }
- assets_manifest: [ direct URLs ]
- metadata: { product_sku, agent_id, buyer_stage, idempotency_key, model: "veo-3.1-fast-generate-001" }

Example JSON payload (minimal)
```json
{
  "model": "veo-3.1-fast-generate-001",
  "master_reference_block": {
    "canonical_url": "https://.../watch?v=abc",
    "image_urls": ["https://.../front.jpg"],
    "timestamps": ["0:12-0:20"],
    "sku": "ACME-3000-BLK",
    "license": "licensed-by-client"
  },
  "prompt_package": "8s how-to: ... (include 'No-substitute' clause)",
  "clip_spec": { "duration": 8.0, "shots": [ { "start": 0, "end": 2.5, "action": "close-up pour" } ] },
  "assets_manifest": ["https://.../overlay.png"],
  "metadata": { "product_sku": "ACME-3000-BLK", "buyer_stage": "Consideration", "idempotency_key": "uuid-v1", "model": "veo-3.1-fast-generate-001" }
}
```

Recommended invocation patterns
- Synchronous -> Asynchronous: Submit job, receive job_id, then poll or receive webhook status. Do NOT block agent threads waiting on generation.
- Use an idempotency_key for retries to avoid duplicate charges / duplicate jobs.
- Include model version in request and log it in job metadata.

Node.js example: submit + polling + retry (concept)
```javascript
// Example: submit job, exponential backoff retry on network/5xx/429, poll status
async function submitJob(payload) {
  const maxAttempts = 5;
  let attempt = 0;
  const idempotencyKey = payload.metadata.idempotency_key;

  while (attempt < maxAttempts) {
    try {
      const res = await fetch("https://api.provider.example/v1/generate/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          "Authorization": `Bearer ${process.env.API_KEY}`
        },
        body: JSON.stringify(payload),
        timeout: 15000
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
        await sleep((retryAfter + 1) * 1000);
        attempt++;
        continue;
      }

      if (res.status >= 500) {
        attempt++;
        await sleep(2 ** attempt * 500);
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Request failed ${res.status}: ${errBody}`);
      }

      const json = await res.json();
      return json.job_id; // proceed to poll or wait for webhook
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts) throw err;
      await sleep(2 ** attempt * 400);
    }
  }
}

async function pollJob(jobId, timeoutMs = 10 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`https://api.provider.example/v1/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${process.env.API_KEY}` }
    });
    const status = await res.json();
    if (status.state === "succeeded") return status.output_url;
    if (status.state === "failed") throw new Error(`Generation failed: ${status.error}`);
    // backoff between polls
    await sleep(1000 + Math.min(8000, (Date.now() - start) / 10));
  }
  throw new Error("Job polling timed out");
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
```

Webhook recommendation (preferred for scale)
- Register a webhook URL when submitting so the generation service posts completion/failure events.
- Verify webhook signatures; accept and enqueue the result in your job queue for the Editor/QA workflows.
- Webhooks avoid polling costs and let agents continue work without blocking.

Error handling & retries (required)
- Retry policy:
  - Retry on transient network errors, 5xx responses, and rate-limit (429) after respecting Retry-After.
  - Use exponential backoff with jitter.
  - Cap retries and surface persistent failures to Director/Assistant PM with failure reason.
- Idempotency:
  - Use idempotency_key per logical generation request.
- Circuit breaker & quota control:
  - Stop heavy retrying if error rate spikes; alert ops.
- Safe-fail:
  - On repeated failures, mark prompts as "needs manual review" and notify Director + Assistant.

Asynchronous system design notes
- Jobs queue: persist job metadata, status (pending / in_progress / succeeded / failed), retries, and output URLs in DB.
- Non-blocking agents: agents submit job then continue; Editor agent or orchestrator handles assembly when outputs arrive.
- Timeouts & cleanup: set reasonable per-job timeouts and mark stale jobs for manual review.
- Notifications: notify Director/QA when job succeeds/fails with links and confidence notes.
- Storage & CDN: store generated assets in secure object storage, serve via CDN for editors and social channels.

Missing items checklist (verify you have these)
- Content safety / moderation checks before publish.
- License & usage verification stored with Master Reference Block.
- Strong logging & observability (request/response, job lifecycle).
- Rate-limit handling and concurrency limits for your account.
- Output validation: visual checks (product color/logo match) automated where possible (image hash / perceptual hash).
- Backup/roll-forward: ability to re-run generation with updated prompt variants (keep history).

Small operational tips (Mac commands)
- Download seed video: youtube-dl -o canonical.mp4 "<CANONICAL_URL>"
- Extract frame for reverse search: ffmpeg -i canonical.mp4 -ss 00:00:12 -vframes 1 frame_logo.jpg

Acceptance criteria before generation
- Master Reference Block present and approved.
- Idempotency key supplied.
- Director/Assistant PM approved any Medium/Low confidence supporting references.
- Monitoring/alerts configured for job failures.

