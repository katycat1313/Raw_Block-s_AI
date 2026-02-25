import { VideoSequence, CountdownSlot } from "../../types";

export class VideoEditorAgent {
    public static assembleTimeline(
        sequence: VideoSequence,
        originalProductName: string
    ): CountdownSlot[] {
        console.log(`✂️ Video Editor: Assembling timeline with ${sequence.boxes.length} cuts...`);

        return sequence.boxes.map((box, i) => ({
            id: Math.random().toString(36).substr(2, 9),
            rank: i + 1,
            productName: originalProductName,
            description: `[${box.type}] ${box.duration}s`,
            productUrl: "",
            media: { images: [], clips: [] },
            generated: {
                status: 'idle',
                imagePrompt: box.imagePrompt,
                videoPrompt: box.visualPrompt,
                script: box.audioScript
            },
            customScript: box.audioScript,
            category: box.type,
            clipType: box.type,
            segment: {
                startTime: "00:00",
                endTime: `00:${box.duration < 10 ? '0' + box.duration : box.duration}`,
                duration: box.duration
            }
        } as CountdownSlot));
    }
}
