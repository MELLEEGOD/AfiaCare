# AfiaCare

<img src="public/assets/afiacare-logo.svg" alt="AfiaCare logo" width="72" height="72" />

A mobile-first React and Tailwind CSS demo app for **AfiaCare**, combining AI-style wellness support, daily habit tracking, and SDG 3: Good Health and Well-being.

Brand scheme: use **AfiaCare** as the product name everywhere. Use UAE, SDG 3, and student well-being as descriptors, not alternate brand names.

## One-Click Start

On Windows, double-click:

```text
Start-AfiaCare.bat
```

That launcher will:

- install dependencies if needed
- build the latest UI
- stop anything already using port `4173`
- start AfiaCare at `http://127.0.0.1:4173`
- open a fresh browser URL with a cache-busting query string

Terminal option:

```bash
npm run boot
```

## Local AI

Copy `.env.example` to `.env` and configure your local services. AfiaCare supports:

- LM Studio/OpenAI-compatible chat via `LOCAL_LLM_PROVIDER=openai`
- LM Studio vision models for food review via `LOCAL_FOOD_VISION_PROVIDER=lmstudio`
- Local CV endpoints for food review and live yoga posture correction via `LOCAL_CV_URL`, `LOCAL_FOOD_VISION_URL`, or `LOCAL_POSTURE_URL`

For a Dell Latitude E5440 with 8 GB RAM in LM Studio, start with:

1. Download a Qwen2.5 1.5B Instruct GGUF model for chat.
2. Download a SmolVLM GGUF model for food-photo analysis.
3. In Developer / Local Server, start the server on `http://127.0.0.1:1234`.
4. Load Qwen for chat tasks, then load SmolVLM when testing food photos.

Recommended order:

1. `qwen2.5:1.5b` for AfiaCare chat and JSON-style responses.
2. `llama3.2:1b` if speed matters more than response quality.
3. `gemma2:2b` if Qwen is too slow but you want better wellness wording than a 1B model.
4. `qwen2.5:0.5b` only as an emergency fallback on very slow hardware.

Avoid 7B+ models on this machine unless you are comfortable with very slow responses and heavy memory pressure.

For posture correction, use MediaPipe Pose Landmarker Lite in the browser. For food photos, AfiaCare can call SmolVLM through LM Studio using `LOCAL_FOOD_VISION_PROVIDER=lmstudio` and `LOCAL_FOOD_VISION_MODEL=smolvlm-500m-instruct`.

AfiaCare is configured with browser-side MediaPipe Pose Landmarker Lite:

- Runtime: `public/mediapipe/wasm`
- Model: `public/models/pose_landmarker_lite.task`
- Page: `Yoga` -> `Live posture correction`

This runs on CPU in the browser. If MediaPipe fails to load, AfiaCare falls back to `/api/posture-analysis` and your configured local CV endpoint.

The posture endpoint should return JSON like:

```json
{
  "postureScore": 82,
  "feedback": ["Back is mostly upright"],
  "corrections": ["Relax shoulders", "Shift weight evenly"],
  "riskLevel": "low",
  "nextCue": "Lengthen your spine and keep breathing."
}
```

The food endpoint should return JSON like:

```json
{
  "dishName": "Chicken rice bowl",
  "estimatedCalories": "500-650 kcal",
  "detectedFoods": ["rice", "chicken", "salad"],
  "balanceScore": 72,
  "proteinLevel": "moderate",
  "suggestions": ["Add more vegetables", "Add water or laban"],
  "caution": "Educational estimate only."
}
```

Low-spec tips:

- Keep `LOCAL_LLM_NUM_CTX=1024` or lower.
- Keep `LOCAL_LLM_MAX_TOKENS=120-180`.
- Use `LOCAL_LLM_NUM_THREAD=2` on the E5440 to keep the laptop responsive.
- Keep only one model loaded in LM Studio when RAM is tight.
- Do not run food VLM and text LLM at the same time if RAM is tight.

## Run Locally

```bash
npm install
npm run boot
```

The app uses browser `localStorage` for mood check-ins, SDG 3 habit progress, family challenge status, and reminders. Real AI uses the local Node server in `scripts/serve-dist.mjs`; Community uses Firebase Authentication and Cloud Firestore.

## Shared Community

Community provides Firebase email/password accounts, public display names, realtime discussions, comments, reactions, shared challenges, meetup creation and RSVP, reports, and a moderator queue. Data persists in Standard Cloud Firestore (`me-central1`).

- Verified Firebase account [configured bootstrap moderator account] is the bootstrap moderator.
- Exact meetup locations are withheld until the signed-in member RSVPs.
- Under-18 accounts must confirm parent or guardian approval.
- Firestore rules and indexes live in `firestore.rules` and `firestore.indexes.json`.

## Real AI Mode

The local server can call LM Studio for therapist-style support, wellness chat, food-image analysis, and movement plans.

1. Create `.env` from `.env.example`.
2. Start LM Studio's local server on port `1234`.
3. Set `LOCAL_LLM_MODEL` and `LOCAL_FOOD_VISION_MODEL` to the exact model IDs shown by LM Studio.
4. Build and serve:

```bash
npm run boot
```

The AI therapist is supportive coaching only. It does not diagnose, treat, or replace licensed mental health care.

