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
## Integration: calling veo-3.1-fast-generate-001, async generation, and robust error handling

Purpose: Ensure agents call veo-3.1-fast-generate-001 reliably, pass the precise prompts (Master Reference Block + clip specs), and that the system handles failures and long-running jobs without blocking agents.

Model id (exact)
- Use: "veo-3.1-fast-generate-001"

Required request fields
- master_reference_block: { canonical_url, image_urls[], timestamps[], sku, license_statement }
- prompt_package: full agent prompt (include "No-substitute" clause)
- clip_spec: { duration: 8.0, shots: [...] }
- assets_manifest: [ direct URLs ]
- metadata: { product_sku, agent_id, buyer_stage, idempotency_key, model: "veo-3.1-fast-generate-001" }

Example payload (JSON)
{
  "model": "veo-3.1-fast-generate-001",
  "master_reference_block": { "canonical_url": "...", "image_urls": ["..."], "timestamps": ["0:12-0:20"], "sku": "ACME-3000-BLK", "license": "licensed-by-client" },
  "prompt_package": "8s how-to: ... (include 'No-substitute' clause)",
  "clip_spec": { "duration": 8.0, "shots": [ { "start": 0, "end": 2.5, "action": "close-up pour" } ] },
  "assets_manifest": ["https://.../overlay.png"],
  "metadata": { "product_sku": "ACME-3000-BLK", "buyer_stage": "Consideration", "idempotency_key": "uuid-v1", "model": "veo-3.1-fast-generate-001" }
}

Notes:
- Submit -> receive job_id -> handle asynchronously (webhook preferred). Use idempotency_key and exponential backoff for retries.
- Persist job state, validate outputs (automated perceptual checks where possible), and notify Director on persistent failures.
- Keep license & Master Reference Block with job metadata.

