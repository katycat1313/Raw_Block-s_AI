
/**
 * Shared Memory for the Agent Team.
 * This allows agents to read what others have discovered and refine their own tasks.
 */
export class SharedMemory {
    private logs: string[] = [];
    private data: Record<string, any> = {};

    public record(agent: string, findings: string, payload?: any) {
        const entry = `[${agent}] ${findings}`;
        this.logs.push(entry);
        console.log(`🧠 Shared Memory: ${entry}`);
        if (payload) {
            this.data[agent] = { ...this.data[agent], ...payload };
        }
    }

    public getLogs(): string[] {
        return this.logs;
    }

    public getData(): Record<string, any> {
        return this.data;
    }

    public clear() {
        this.logs = [];
        this.data = {};
    }
}
