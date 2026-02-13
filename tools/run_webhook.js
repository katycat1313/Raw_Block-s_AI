// tools/run_webhook.js
// Minimal runner to start the webhook handler in tools/veo_submit_helper.js
// Usage:
//   export WEBHOOK_SECRET="your-secret"
//   node tools/run_webhook.js

import { createWebhookHandler } from "./veo_submit_helper.js";

const SECRET = process.env.WEBHOOK_SECRET || "test-secret";

const app = createWebhookHandler({
  secret: SECRET,
  onComplete: async (body) => {
    // simple processing: log the event and write a small JSON file for inspection
    console.log("webhook onComplete:", JSON.stringify(body, null, 2));
  },
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`webhook listening: http://localhost:${PORT}/webhook/veo (use WEBHOOK_SECRET env to set signature secret)`);
});
