
import { GeminiService } from "./geminiService";

export class StorageService {
    private static readonly BUCKET_SUFFIX = '-generated-assets';

    /**
     * Uploads a file (Blob/File) to Google Cloud Storage.
     * requires the Service Account to have 'Storage Object Admin' role.
     * 
     * @param file The file or blob to upload.
     * @param filename The destination filename (e.g., 'images/product-1.png').
     * @param mimeType The content type.
     * @returns The public URL (if bucket is public) and the GS URI.
     */
    public static async uploadFile(file: Blob, filename: string, mimeType: string): Promise<{ publicUrl: string; gsUri: string }> {
        const { token, projectId } = await GeminiService.getAuth();
        const bucketName = `${projectId}${this.BUCKET_SUFFIX}`;

        // Simple upload endpoint
        const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(filename)}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': mimeType
                },
                body: file
            });

            if (response.status === 404) {
                throw new Error(`Bucket '${bucketName}' not found. Please create it in Google Cloud Console.`);
            }

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`GCS Upload Failed (${response.status}): ${text}`);
            }

            const data = await response.json();

            // Calculate URLs
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
            const gsUri = `gs://${bucketName}/${filename}`;

            console.log(`✅ Uploaded to GCS: ${gsUri}`);
            return { publicUrl, gsUri };

        } catch (error: any) {
            console.error("Storage Service Error:", error);
            throw error;
        }
    }

    /**
     * Ensures the bucket exists (optional check).
     * Note: Creating buckets requires Project Editor/Owner or Storage Admin roles.
     */
    public static async ensureBucketExists(): Promise<void> {
        const { token, projectId } = await GeminiService.getAuth();
        const bucketName = `${projectId}${this.BUCKET_SUFFIX}`;

        // Check if exists
        const checkUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}`;
        const checkRes = await fetch(checkUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (checkRes.ok) return;

        if (checkRes.status === 404) {
            console.log(`Creating bucket: ${bucketName}...`);
            const createUrl = `https://storage.googleapis.com/storage/v1/b?project=${projectId}`;
            const createRes = await fetch(createUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: bucketName,
                    location: 'US-CENTRAL1',
                    storageClass: 'STANDARD',
                    iamConfiguration: { uniformBucketLevelAccess: { enabled: true } }
                })
            });

            if (!createRes.ok) {
                const text = await createRes.text();
                throw new Error(`Failed to create bucket ${bucketName}: ${text}`);
            }
            console.log(`✅ Bucket ${bucketName} created.`);

            // Allow public read (Optional - warn user if skipped)
            // We can't easily set IAM policy via REST without complex calls, 
            // so we'll advising the user to set public access if needed for <img src>.
        }
    }
}
