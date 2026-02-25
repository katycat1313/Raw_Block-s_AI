
import { ProductDossier, SocialStrategy, VideoSequence } from "../../../types";

export interface AgentContext {
    dossier: ProductDossier;
    strategy?: SocialStrategy;
    sequence?: VideoSequence;
    memory: string[]; // A list of thoughts/findings shared between agents
    mission: string;  // The overarching goal
    onDialogue?: (event: { agent: string, role: string, message: string, type: 'thought' | 'debate' | 'prompt' | 'finding' }) => void;
    sharedMemory?: any;
}

export abstract class BaseAgent {
    protected name: string;
    protected role: string;

    constructor(name: string, role: string) {
        this.name = name;
        this.role = role;
    }

    protected log(msg: string) {
        console.log(`[${this.name}] ${msg}`);
    }

    // Shared execution method
    abstract execute(context: AgentContext): Promise<AgentContext>;
}
