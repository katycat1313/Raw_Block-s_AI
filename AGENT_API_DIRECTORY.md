# 🤖 Raw Blocks AI Agent Integration Manual & OpenAPI Gateway Spec

Welcome to the **Raw Blocks AI Agent Gateway (`/api/v1`)**.

This document is the **complete, end-to-end integration manual and API directory** for autonomous AI agents (such as Social Media Agents, Creative Directors, Content Agents, or Orchestration Bots) to programmatically control every capability of **Raw Blocks AI**.

---

## 📑 Quick Navigation
1. [Architecture & Agent Permissions](#1-architecture--agent-permissions)
2. [Authentication & Base URL](#2-authentication--base-url)
3. [The Complete API Directory (Route Reference)](#3-the-complete-api-directory-route-reference)
   - [Auth & System Health](#endpoint-1-get-apiv1authverify)
   - [Block Library & Taxonomy](#endpoint-2-get-apiv1blocks)
   - [Autonomous Screen Scout & Video Capture](#endpoint-3-post-apiv1scout)
   - [Upload Screenshots, Images & Custom Video](#endpoint-4-post-apiv1upload)
   - [AI Scriptwriting & Screenplay Beats](#endpoint-5-post-apiv1scriptwrite)
   - [Text-to-Speech & Voice Library](#endpoint-6-get-apiv1voices--post-apiv1tts)
   - [Autonomous Video Production & Rendering](#endpoint-7-post-apiv1produce)
   - [Direct Timeline & EDL Assembly](#endpoint-8-post-apiv1timelineassemble)
   - [Rendered Video Library & Assets](#endpoint-9-get-apiv1renders)
   - [Social Media Publishing](#endpoint-10-post-apiv1publish)
4. [Step-by-Step Autonomous Workflows](#4-step-by-step-autonomous-workflows)
5. [Standard Error Codes & Handling](#5-standard-error-codes--handling)

---

## 1. Architecture & Agent Permissions

Raw Blocks AI runs a multi-agent assembly pipeline:
* **Scout Agent:** Puppeteer/Playwright browser automation capturing live web application screens, flows, and animations at 1080p.
* **Screenplay Agent:** Powered by Gemini 2.5 Flash for multimodal visual breakdown, spoken cadence timing, and 3-second hook formulation.
* **Sound Agent:** Powered by Deepgram Aura for millisecond-accurate speech synthesis and audio mixing with auto-ducking.
* **Director Agent:** Computes Edit Decision Lists (EDLs), cutting in/out timestamps, UI spotlight zoom coordinates, and transition pacing.
* **Rendering Engine:** Native FFmpeg pipeline outputting broadcast-grade 1080p MP4s (16:9 landscape or 9:16 vertical short-form).

Any external autonomous agent calling this API possesses full administrative capabilities: scouting new video blocks, uploading custom media, generating and editing narration, selecting human voices, compiling videos, and retrieving or publishing final MP4s.

---

## 2. Authentication & Base URL

### Base URLs
* **Production Tunnel (Live):**
  ```text
  https://levels-jungle-ray-remarks.trycloudflare.com/api/v1
  ```
* **Render Web Service (When deployed):**
  ```text
  https://raw-block-s-ai.onrender.com/api/v1
  ```
* **Localhost Development:**
  ```text
  http://localhost:3001/api/v1
  ```

### Authentication Header
Every request to `/api/v1/*` requires the `RAW_BLOCKS_API_KEY`. You can supply it in either header format:

```http
x-api-key: raw_live_620a80f199348c1aa7525e49f1c9cca04db38b4bbe2b8ca6
```
*or*
```http
Authorization: Bearer raw_live_620a80f199348c1aa7525e49f1c9cca04db38b4bbe2b8ca6
```

---

## 3. The Complete API Directory (Route Reference)

---

### Endpoint 1: `GET /api/v1/auth/verify`
> **Purpose:** Handshake check to verify your API key, check active project metadata, and inspect library size.

#### Request
```http
GET /api/v1/auth/verify HTTP/1.1
Host: levels-jungle-ray-remarks.trycloudflare.com
x-api-key: <RAW_BLOCKS_API_KEY>
```

#### Response (`200 OK`)
```json
{
  "status": "ok",
  "authenticated": true,
  "service": "Raw Blocks AI Agent Gateway",
  "version": "1.0.0",
  "project": "krechet_academy",
  "targetAppUrl": "https://krechet.academy",
  "totalBlocks": 9,
  "totalRenders": 18,
  "endpoints": {
    "verify": "GET /api/v1/auth/verify",
    "blocks": "GET /api/v1/blocks",
    "scout": "POST /api/v1/scout",
    "upload": "POST /api/v1/upload",
    "script": "POST /api/v1/script/write",
    "voices": "GET /api/v1/voices",
    "produce": "POST /api/v1/produce",
    "timeline": "POST /api/v1/timeline/assemble",
    "renders": "GET /api/v1/renders",
    "publish": "POST /api/v1/publish"
  }
}
```

---

### Endpoint 2: `GET /api/v1/blocks`
> **Purpose:** Query, search, and filter existing visual blocks (video clips, screen recordings, B-roll) in the library.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `category` | String | No | Taxonomy category (`A` = Hook/Hero, `B` = Interactive Simulator, `C` = Client/Agency, `D` = Analytics/Boardroom, `E` = Credential/Outro). |
| `search` | String | No | Full-text search across titles, descriptions, and tags. |
| `minDuration` | Number | No | Minimum clip length in seconds. |
| `maxDuration` | Number | No | Maximum clip length in seconds. |

#### Request
```http
GET /api/v1/blocks?category=B&search=simulator HTTP/1.1
x-api-key: <RAW_BLOCKS_API_KEY>
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "count": 3,
  "totalInLibrary": 9,
  "blocks": [
    {
      "blockCode": "B1",
      "category": "B",
      "title": "A/B Testing Headline Lab Simulation",
      "description": "Student split-tests Jenny's coffee headline with live 50/50 traffic routing.",
      "duration": 5.2,
      "actionType": "interactive_simulation",
      "reusability": "modular",
      "tags": ["Scouted Block", "A/B Testing", "1080p"],
      "streamUrl": "https://.../storage/uploads/clip_123.mp4",
      "thumbnailUrl": "https://.../storage/thumbnails/clip_123.jpg",
      "downloadUrl": "https://.../api/download?file=clip_123.mp4"
    }
  ]
}
```

---

### Endpoint 3: `POST /api/v1/scout`
> **Purpose:** Command the autonomous Scout Agent to navigate to any web application URL, record high-resolution screen interactions, slice them into micro-blocks, index them with Gemini Vision, and add them to the library.

#### Request Body
```json
{
  "url": "https://krechet.academy",
  "directive": "Scout the Google Ads simulation and Negative Keyword Shield workbench",
  "clipCount": 3,
  "clipDuration": 5.0,
  "speedMultiplier": 1.25
}
```

#### Parameters
* `url` *(string, optional, defaults to project URL)*: The target application to record.
* `directive` *(string, required)*: Specific natural language instruction describing what UI features to interact with and capture.
* `clipCount` *(integer, 1-6, default: 3)*: Number of distinct clips to record.
* `clipDuration` *(float, 3.0-10.0s, default: 5.0)*: Target duration of each recorded clip.
* `speedMultiplier` *(float, default: 1.25)*: Playback speed for snappier UI pacing.

#### Response (`200 OK`)
```json
{
  "success": true,
  "count": 3,
  "directive": "Scout the Google Ads simulation and Negative Keyword Shield workbench",
  "blocks": [
    {
      "blockCode": "B2",
      "category": "B",
      "title": "Negative Keyword Shield Defense",
      "description": "Demonstrates blocking wasted ad clicks on craft coffee terms",
      "duration": 5.1,
      "streamUrl": "https://.../storage/uploads/scout_1.mp4",
      "thumbnailUrl": "https://.../storage/thumbnails/scout_1.jpg"
    }
  ]
}
```

---

### Endpoint 4: `POST /api/v1/upload`
> **Purpose:** Programmatically upload an image screenshot, product photo, or existing MP4 video file to become an indexed block in the library.

#### Request (`multipart/form-data`)
* `file`: The media file (PNG, JPG, MP4, WebM).
* `title`: *(optional)* Descriptive name.
* `category`: *(optional)* `A`, `B`, `C`, `D`, or `E`.
* `tags`: *(optional)* Comma-separated tags.

```http
POST /api/v1/upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXYZ
x-api-key: <RAW_BLOCKS_API_KEY>

------WebKitFormBoundaryXYZ
Content-Disposition: form-data; name="file"; filename="dashboard_hero.png"
Content-Type: image/png

<binary data>
------WebKitFormBoundaryXYZ
Content-Disposition: form-data; name="title"

Dashboard Metric Overview
------WebKitFormBoundaryXYZ
Content-Disposition: form-data; name="category"

A
------WebKitFormBoundaryXYZ--
```

---

### Endpoint 5: `POST /api/v1/script/write`
> **Purpose:** Use the Screenplay Agent to generate or polish a multi-beat script with millisecond timing, sensory language, and tailored call-to-actions.

#### Request Body
```json
{
  "mode": "prompt_generate",
  "prompt": "Create an urgent 15-second commercial for aspiring digital marketers about stopping client budget waste",
  "durationSeconds": 15,
  "targetAudience": "Freelancers and career switchers"
}
```

#### Modes
* `prompt_generate`: The agent creates the full script from your creative brief.
* `polish_draft`: You provide rough bullet points in `rawDraft`, and the agent refines them into rhythmically paced voiceover lines.

#### Response (`200 OK`)
```json
{
  "success": true,
  "headline": "Stop Burning Client Budgets",
  "totalEstimatedDuration": 14.8,
  "beats": [
    {
      "beatNumber": 1,
      "suggestedCategory": "A",
      "narration": "Most beginners burn thousands on broad match ads before realizing why clients fire them.",
      "visualFocus": "High-contrast search auction drop-off graph",
      "duration": 4.5
    },
    {
      "beatNumber": 2,
      "suggestedCategory": "B",
      "narration": "In Krechet Academy, you master the Negative Keyword Shield before touching real dollars.",
      "visualFocus": "Interactive shield slider turning green",
      "duration": 5.8
    },
    {
      "beatNumber": 3,
      "suggestedCategory": "E",
      "narration": "Test your instincts now at krechet.academy.",
      "visualFocus": "Accreditation seal with CTA",
      "duration": 4.5
    }
  ]
}
```

---

### Endpoint 6: `GET /api/v1/voices`
> **Purpose:** Retrieve the full list of available lifelike human voiceover models (Deepgram Aura).

#### Request
```http
GET /api/v1/voices HTTP/1.1
x-api-key: <RAW_BLOCKS_API_KEY>
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "voices": [
    { "id": "aura-orion-en", "name": "Orion", "gender": "Male", "tone": "Deep, Authoritative, Professional" },
    { "id": "aura-asteria-en", "name": "Asteria", "gender": "Female", "tone": "Engaging, Confident, Modern" },
    { "id": "aura-luna-en", "name": "Luna", "gender": "Female", "tone": "Warm, Articulate, Educational" },
    { "id": "aura-zeus-en", "name": "Zeus", "gender": "Male", "tone": "Energetic, Bold, Commercial" }
  ]
}
```

---

### Endpoint 7: `POST /api/v1/produce`
> **Purpose:** The **All-in-One Autonomous Production Engine**. An agent calls this with a goal, and Raw Blocks AI automatically:
1. Selects the most relevant visual blocks from the library.
2. Writes and synchronizes the voiceover script.
3. Synthesizes human speech via Deepgram Aura.
4. Generates an EDL and cuts the clips to fit the speech beats.
5. Ducks background music and renders the final 1080p MP4.
6. Writes platform-optimized social media copy and hashtags.

#### Request Body
```json
{
  "goal": "Create a high-energy 10-second TikTok showing how students test real A/B headlines and boost conversion rates",
  "voiceId": "aura-orion-en",
  "targetPlatform": "tiktok",
  "aspectRatio": "9:16",
  "generateSocialCopy": true,
  "speedMultiplier": 1.25
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "renderId": "agent_render_1773682941000",
  "filename": "agent_render_1773682941000.mp4",
  "videoUrl": "https://levels-jungle-ray-remarks.trycloudflare.com/storage/renders/agent_render_1773682941000.mp4",
  "downloadUrl": "https://levels-jungle-ray-remarks.trycloudflare.com/api/download?file=agent_render_1773682941000.mp4",
  "duration": 10.4,
  "width": 1080,
  "height": 1920,
  "sceneCount": 3,
  "socialCopy": {
    "platform": "tiktok",
    "headline": "Can you spot the winning headline?",
    "hook": "90% of beginner ads bleed cash on day one...",
    "caption": "Learn how to calculate break-even CPA and launch real A/B tests inside our interactive simulation academy! 🚀 Link in bio.",
    "hashtags": ["#marketingtips", "#growthhacking", "#abtesting", "#digitalmarketer", "#cro"],
    "callToAction": "Try the free simulator at krechet.academy"
  }
}
```

---

### Endpoint 8: `POST /api/v1/timeline/assemble`
> **Purpose:** For precision directing. An agent supplies its exact Edit Decision List (EDL)—choosing exact block IDs, start/end timestamps, custom narration lines, and UI spotlight focuses.

#### Request Body
```json
{
  "voiceId": "aura-asteria-en",
  "musicTrack": "chill_tech_ambient.mp3",
  "timeline": [
    {
      "blockCode": "A1",
      "narration": "What if you could simulate a marketing agency before spending real money?",
      "spotlightQuadrant": "center",
      "zoom": 1.05
    },
    {
      "blockCode": "B1",
      "narration": "Deploy live A/B tests, measure CAC, and guard real client budgets.",
      "spotlightQuadrant": "top-right",
      "zoom": 1.15
    }
  ]
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "renderId": "custom_assembly_1773683011",
  "videoUrl": "https://.../storage/renders/custom_assembly_1773683011.mp4",
  "duration": 12.6
}
```

---

### Endpoint 9: `GET /api/v1/renders`
> **Purpose:** List all rendered videos available for download or social distribution.

#### Request
```http
GET /api/v1/renders HTTP/1.1
x-api-key: <RAW_BLOCKS_API_KEY>
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "count": 18,
  "renders": [
    {
      "filename": "krechet_commercial_master.mp4",
      "title": "Krechet Academy Master Commercial",
      "badge": "1080p Master",
      "duration": "14.2s",
      "sizeMb": "8.4 MB",
      "createdAt": "2026-11-15T20:10:00Z",
      "videoUrl": "https://.../storage/renders/krechet_commercial_master.mp4",
      "downloadUrl": "https://.../api/download?file=krechet_commercial_master.mp4"
    }
  ]
}
```

---

### Endpoint 10: `POST /api/v1/publish`
> **Purpose:** Push any rendered MP4 directly to connected social platform accounts (TikTok, Facebook, Instagram, YouTube).

#### Request Body
```json
{
  "videoFilename": "agent_render_1773682941000.mp4",
  "platform": "tiktok",
  "caption": "Test your marketing instinct at krechet.academy! 🚀",
  "hashtags": ["#digitalmarketing", "#careeradvice", "#marketingtips"]
}
```

---

## 4. Step-by-Step Autonomous Workflows

### Scenario: Autonomous Daily Commercial Production
An autonomous agent running on a cron schedule or reacting to an event can execute this entire flow with 3 API calls:

```
[1. GET /blocks] ──> Check available B-Roll/UI Clips
       │
       ▼ (If missing clips, run [POST /scout] to record the live app)
       │
[2. POST /produce] ──> Specify goal, target voice & platform
       │
       ▼ (Raw Blocks AI writes script, generates TTS, cuts video, renders MP4 & writes caption)
       │
[3. POST /publish] ──> Push final MP4 & caption directly to TikTok/Instagram
```

---

## 5. Standard Error Codes & Handling

| Status Code | Meaning | Remediation |
| :--- | :--- | :--- |
| `401 Unauthorized` | Invalid or missing `x-api-key`. | Ensure your header contains `x-api-key: <RAW_BLOCKS_API_KEY>`. |
| `400 Bad Request` | Missing required parameters (`directive`, `goal`, etc.). | Inspect response JSON for specific field requirement. |
| `404 Not Found` | Requested block or render file does not exist on disk. | Call `GET /blocks` or `GET /renders` to check existing assets. |
| `500 Server Error` | FFmpeg or upstream API issue. | Check `GET /api/health` to confirm Gemini and Deepgram keys are valid. |

---

### 🛡️ Master Integration Key
```text
raw_live_620a80f199348c1aa7525e49f1c9cca04db38b4bbe2b8ca6
```
*(Store this key as a secret in your calling application's `.env` as `RAW_BLOCKS_API_KEY`)*
