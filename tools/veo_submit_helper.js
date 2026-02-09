/* filepath: /Users/katycat/github-repo's/Raw_Block-s_AI/tools/veo_submit_helper.js */
// ...new file...
import crypto from "crypto";
import express from "express";

/**
 * submitJob: POST payload to generator, retry on transient errors.
 * payload.metadata.idempotency_key must be set by caller.
 */
export async function submitJob(apiUrl, apiKey, payload, maxAttempts = 5) {
  const idempotencyKey = payload.metadata?.idempotency_key || crypto.randomUUID();
  payload.metadata = { ...payload.metadata, idempotency_key: idempotencyKey, model: "veo-3.1-fast-generate-001" };

  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const res = await fetch(`${apiUrl}/v1/generate/video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
        await sleep((retryAfter + randomJitter()) * 1000);
        continue;
      }

      if (res.status >= 500) {
        await sleep(exponentialBackoff(attempt));
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Generation request failed ${res.status}: ${body}`);
      }

      const json = await res.json();
      return json.job_id;
    } catch (err) {
      if (attempt >= maxAttempts) throw new Error(`submitJob failed after ${attempt} attempts: ${err.message}`);
      await sleep(exponentialBackoff(attempt) + randomJitter());
    }
  }
  throw new Error("submitJob reached unexpected exit");
}

export async function pollJobStatus(apiUrl, apiKey, jobId, timeoutMs = 10 * 60 * 1000) {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < timeoutMs) {
    attempt++;
    const res = await fetch(`${apiUrl}/v1/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) {
      await sleep(exponentialBackoff(attempt));
      continue;
    }
    const status = await res.json();
    if (status.state === "succeeded") return status.output_url || status.result;
    if (status.state === "failed") throw new Error(`Generation failed: ${status.error || JSON.stringify(status)}`);
    await sleep(Math.min(5000, 1000 + attempt * 500));
  }
  throw new Error("Job polling timed out");
}

// Minimal webhook example to accept completion events and validate signature
export function createWebhookHandler({ secret, onComplete }) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.post("/webhook/veo", (req, res) => {
    const sig = req.headers["x-webhook-signature"] || "";
    const payload = JSON.stringify(req.body || {});
    if (!verifySignature(payload, sig, secret)) {
      res.status(401).send("invalid signature");
      return;
    }
    const body = req.body;
    onComplete(body).catch((err) => console.error("onComplete handler error:", err));
    res.status(200).send("ok");
  });

  return app;
}

// Helpers
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function exponentialBackoff(attempt) { return Math.min(30000, Math.pow(2, attempt) * 250); }
function randomJitter() { return Math.floor(Math.random() * 1000); }

function verifySignature(payload, signatureHeader, secret) {
  if (!secret || !signatureHeader) return false;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signatureHeader));
}

export default { submitJob, pollJobStatus, createWebhookHandler };
