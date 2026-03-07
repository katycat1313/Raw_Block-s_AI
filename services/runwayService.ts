/**
 * RunwayService - Calls Runway ML API via the local Vite dev-server proxy
 * (/api/runway/*) to avoid CORS issues. The proxy (vite.config.ts) injects
 * the VITE_RUNWAY_API_KEY server-side so the key never travels to the browser.
 *
 * Required .env variable:
 *   VITE_RUNWAY_API_KEY  - your Runway API secret key
 */

const PROXY_BASE = '/api/runway';

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

function exponentialBackoff(attempt: number): number {
    return Math.min(30000, Math.pow(2, attempt) * 250);
}

export class RunwayService {
    public static isConfigured(): boolean {
        return !!(import.meta.env.VITE_RUNWAY_API_KEY as string);
    }

    /**
     * Submit a video generation job and poll until completion.
     * Returns the final video URL.
     */
    public static async generateVideo(
        prompt: string,
        referenceImageUrl?: string
    ): Promise<string> {
        const jobId = await this.submitJob(prompt, referenceImageUrl);
        return await this.pollJobStatus(jobId);
    }

    private static async submitJob(
        prompt: string,
        referenceImageUrl?: string,
        maxAttempts = 5
    ): Promise<string> {
        const idempotencyKey = crypto.randomUUID();

        const payload: Record<string, unknown> = {
            model: 'gen3a_turbo',
            promptText: prompt,
            duration: 5,
            ratio: '1280:768',
        };

        if (referenceImageUrl) {
            payload.promptImage = referenceImageUrl;
        }

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const res = await fetch(`${PROXY_BASE}/v1/image_to_video`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Idempotency-Key': idempotencyKey,
                    },
                    body: JSON.stringify(payload),
                });

                if (res.status === 429) {
                    const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
                    await sleep((retryAfter + Math.floor(Math.random() * 2)) * 1000);
                    continue;
                }

                if (res.status >= 500) {
                    await sleep(exponentialBackoff(attempt));
                    continue;
                }

                if (!res.ok) {
                    const body = await res.text();
                    throw new Error(`Video generation request failed (${res.status}): ${body}`);
                }

                const json = await res.json();
                if (!json.id) throw new Error('API response missing id');
                return json.id as string;
            } catch (err: any) {
                if (attempt >= maxAttempts) {
                    throw new Error(`submitJob failed after ${attempt} attempts: ${err.message}`);
                }
                await sleep(exponentialBackoff(attempt) + Math.floor(Math.random() * 1000));
            }
        }

        throw new Error('submitJob reached unexpected exit');
    }

    private static async pollJobStatus(
        jobId: string,
        timeoutMs = 10 * 60 * 1000
    ): Promise<string> {
        const start = Date.now();
        let attempt = 0;

        while (Date.now() - start < timeoutMs) {
            attempt++;

            const res = await fetch(`${PROXY_BASE}/v1/tasks/${jobId}`);

            if (!res.ok) {
                await sleep(exponentialBackoff(attempt));
                continue;
            }

            const status = await res.json();

            if (status.status === 'SUCCEEDED') {
                const url = status.output?.[0];
                if (!url) throw new Error('Job succeeded but no output URL returned');
                return url as string;
            }

            if (status.status === 'FAILED') {
                throw new Error(`Video generation failed: ${status.failure || status.failureCode || JSON.stringify(status)}`);
            }

            await sleep(Math.min(5000, 1000 + attempt * 500));
        }

        throw new Error('Video generation timed out after 10 minutes');
    }
}
