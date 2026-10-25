# Raw Blocks AI Studio — Semantic Video Assembler & Multi-Agent Production Suite

An autonomous multi-agent video production studio that transforms raw video clips and screen recordings into polished, narrated, and scored videos.

---

## 🌟 Key Capabilities

1. **Intelligent Clip Understanding (Vision Scout)**:
   - Analyzes uploaded video clips and screen recordings using Gemini Multimodal Vision.
   - Automatically detects UI screens, buttons, actions, lighting profiles, and scene durations.

2. **3 Flexible Script & Narration Modes**:
   - 🤖 **AI Writes Script from Prompt**: Describe what you want the video to accomplish; the Screenplay Agent drafts the narration matching the available visuals.
   - ✍️ **Polish My Draft**: Provide rough bullet points or talking points; the Screenplay Agent refines them into punchy, spoken-word beats.
   - 📜 **Direct User Script**: Type your exact narration; the agents time-align the sentences to your video clips.

3. **Human-Sounding Voiceover (Deepgram Aura)**:
   - 12 natural Deepgram Aura human voices (Orion, Asteria, Luna, Stella, Zeus, etc.).
   - Exact speech duration measurement so video clips are cut to the millisecond.

4. **Intelligent Video Sequencing & Timeline Assembly**:
   - The **Director Agent** matches each line of narration to the most semantically relevant clip segment.
   - Automatically calculates `in` and `out` cut points to fit voiceover length.

5. **Lighting & Post-Processing (Visual Stylist)**:
   - 🎯 **Screen Recording Spotlight & Focus Zoom**: Dynamically spotlights active UI quadrants and applies subtle focus zooms for instructional clarity.
   - 💡 **Auto-Balance Lighting & Exposure**: Normalizes exposure, contrast, and brightness across different camera clips.

6. **Automated Background Music Ducking & FFmpeg Master Render**:
   - Includes royalty-free ambient background music tracks.
   - Automatically ducks (lowers volume of) background music whenever the voiceover speaks via sidechain compression.
   - Assembles and renders the final 1080p MP4 directly on your machine.

---

## 👥 The Agent Team

| Agent | Role | Responsibility |
| :--- | :--- | :--- |
| 🕵️ **Scout Agent** | Asset Scout & Vision | Catalogs uploaded footage, detects screen recordings vs live action, indexes actions and lighting |
| ✍️ **Screenplay Agent** | Head Writer | Drafts or polishes narration, divides script into visual beats, paces cadence |
| 🎙️ **Sound Agent** | Audio Producer | Synthesizes Deepgram Aura voiceover, measures millisecond duration, mixes background music |
| 🎬 **Director Agent** | Lead Editor | Matches voiceover beats to clips, calculates in/out cut points, builds master EDL |
| ✨ **Stylist Agent** | Visual FX Lead | Balances lighting/exposure, applies screen recording spotlights, focus zooms, and transitions |

---

## 🚀 Quickstart

### 1. Install Dependencies
Dependencies are already installed, but if setting up on a new machine:
```bash
npm install
```

### 2. Start the Studio
Run one single command to launch both the backend video rendering engine and frontend interface:
```bash
npm run dev
```

* **Frontend UI**: [http://localhost:3000](http://localhost:3000)
* **Backend API & FFmpeg Engine**: [http://localhost:3001](http://localhost:3001)

### 3. API Keys (Optional)
The system has **built-in intelligent fallbacks** so you can run, direct, and render videos immediately even without API keys!

To enable cloud AI features:
* **Google Gemini API Key**: For multimodal video vision and dynamic script generation.
* **Deepgram API Key**: For lifelike human voiceover synthesis.

You can configure them in `.env`:
```env
GEMINI_API_KEY=your_gemini_key_here
DEEPGRAM_API_KEY=your_deepgram_key_here
```
Or click the **⚙️ Keys & Config** button directly in the web UI at any time.

---

## 📁 Project Architecture

```
Raw_Block-s_AI/
├── server/
│   ├── server.js              # Express API server (uploads, orchestrator, render)
│   ├── agentOrchestrator.js    # Multi-agent coordination (Scout, Screenplay, Sound, Director, Stylist)
│   ├── ffmpegService.js        # Video trimming, scaling, spotlight/lighting FX, music ducking
│   ├── clipVisionService.js    # Multimodal video analysis with Gemini
│   └── deepgramService.js      # Deepgram Aura TTS integration & duration measurement
├── components/
│   ├── AgentWorkflowPage.tsx   # Master studio layout & orchestration controller
│   ├── ClipLibrary.tsx         # Drag-and-drop video uploader & indexed clip cards
│   ├── DirectorStudio.tsx      # Prompt input, 3 script modes, voice & lighting controls
│   ├── TimelinePreview.tsx     # Master storyboard EDL & final MP4 video player
│   ├── BoardroomModal.tsx      # Real-time agent thought & debate visualizer
│   └── ApiKeyModal.tsx         # In-browser API key manager
└── storage/
    ├── uploads/                # User uploaded video clips
    ├── thumbnails/             # Video thumbnail previews
    ├── audio/                  # Generated voiceovers
    ├── music/                  # Background music tracks
    └── renders/                # Final assembled MP4 videos
```
