export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | string;
  accent?: string;
  tier?: 'Flux' | 'Aura 2' | 'Aura 1' | string;
  style: string;
}

export const ALL_DEEPGRAM_VOICES: VoiceOption[] = [
  // Flux Conversational (Recommended)
  { id: 'flux-wade-en', name: 'Wade', gender: 'Male', accent: 'American', tier: 'Flux', style: 'American • Warm, Natural & Conversational' },

  // Aura-2 Studio — Male (16 Voices)
  { id: 'aura-2-apollo-en', name: 'Apollo (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Confident, Comfortable, Casual' },
  { id: 'aura-2-arcas-en', name: 'Arcas (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Natural, Smooth, Clear' },
  { id: 'aura-2-aries-en', name: 'Aries (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Warm, Energetic, Caring' },
  { id: 'aura-2-atlas-en', name: 'Atlas (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Mature • Enthusiastic, Confident, Friendly' },
  { id: 'aura-2-draco-en', name: 'Draco (v2)', gender: 'Male', accent: 'British', tier: 'Aura 2', style: 'British • Warm, Approachable, Trustworthy Baritone' },
  { id: 'aura-2-hermes-en', name: 'Hermes (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Expressive, Engaging, Professional' },
  { id: 'aura-2-hyperion-en', name: 'Hyperion (v2)', gender: 'Male', accent: 'Australian', tier: 'Aura 2', style: 'Australian • Caring, Warm, Empathetic' },
  { id: 'aura-2-jupiter-en', name: 'Jupiter (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Expressive, Knowledgeable, Baritone' },
  { id: 'aura-2-mars-en', name: 'Mars (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Smooth, Patient, Trustworthy Baritone' },
  { id: 'aura-2-neptune-en', name: 'Neptune (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Professional, Patient, Polite' },
  { id: 'aura-2-odysseus-en', name: 'Odysseus (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Calm, Smooth, Comfortable' },
  { id: 'aura-2-orion-en', name: 'Orion (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Approachable, Comfortable, Calm' },
  { id: 'aura-2-orpheus-en', name: 'Orpheus (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Professional, Clear, Confident' },
  { id: 'aura-2-pluto-en', name: 'Pluto (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Smooth, Calm, Empathetic Baritone' },
  { id: 'aura-2-saturn-en', name: 'Saturn (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Knowledgeable, Confident, Baritone' },
  { id: 'aura-2-zeus-en', name: 'Zeus (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Deep, Trustworthy, Smooth' },

  // Aura-2 Studio — Female (25 Voices)
  { id: 'aura-2-thalia-en', name: 'Thalia (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Clear, Confident, Energetic' },
  { id: 'aura-2-amalthea-en', name: 'Amalthea (v2)', gender: 'Female', accent: 'Filipino', tier: 'Aura 2', style: 'Filipino • Young Adult • Engaging, Natural, Cheerful' },
  { id: 'aura-2-andromeda-en', name: 'Andromeda (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Casual, Expressive, Comfortable' },
  { id: 'aura-2-asteria-en', name: 'Asteria (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Clear, Confident, Knowledgeable' },
  { id: 'aura-2-athena-en', name: 'Athena (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Mature • Calm, Smooth, Professional' },
  { id: 'aura-2-aurora-en', name: 'Aurora (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Cheerful, Expressive, Energetic' },
  { id: 'aura-2-callista-en', name: 'Callista (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Clear, Energetic, Professional' },
  { id: 'aura-2-cora-en', name: 'Cora (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Smooth, Melodic, Caring' },
  { id: 'aura-2-cordelia-en', name: 'Cordelia (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Young Adult • Approachable, Warm, Polite' },
  { id: 'aura-2-delia-en', name: 'Delia (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Young Adult • Casual, Friendly, Cheerful' },
  { id: 'aura-2-electra-en', name: 'Electra (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Professional, Engaging, Knowledgeable' },
  { id: 'aura-2-harmonia-en', name: 'Harmonia (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Empathetic, Clear, Calm' },
  { id: 'aura-2-helena-en', name: 'Helena (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Caring, Natural, Positive' },
  { id: 'aura-2-hera-en', name: 'Hera (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Smooth, Warm, Professional' },
  { id: 'aura-2-iris-en', name: 'Iris (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Young Adult • Cheerful, Positive, Approachable' },
  { id: 'aura-2-janus-en', name: 'Janus (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Southern, Smooth, Trustworthy' },
  { id: 'aura-2-juno-en', name: 'Juno (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Natural, Engaging, Melodic' },
  { id: 'aura-2-luna-en', name: 'Luna (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Young Adult • Friendly, Natural, Engaging' },
  { id: 'aura-2-minerva-en', name: 'Minerva (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Positive, Friendly, Natural' },
  { id: 'aura-2-ophelia-en', name: 'Ophelia (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Expressive, Enthusiastic, Cheerful' },
  { id: 'aura-2-pandora-en', name: 'Pandora (v2)', gender: 'Female', accent: 'British', tier: 'Aura 2', style: 'British • Smooth, Calm, Melodic' },
  { id: 'aura-2-phoebe-en', name: 'Phoebe (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Energetic, Warm, Casual' },
  { id: 'aura-2-selene-en', name: 'Selene (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Expressive, Engaging, Energetic' },
  { id: 'aura-2-theia-en', name: 'Theia (v2)', gender: 'Female', accent: 'Australian', tier: 'Aura 2', style: 'Australian • Expressive, Polite, Sincere' },
  { id: 'aura-2-vesta-en', name: 'Vesta (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Natural, Expressive, Patient' },

  // Aura-1 Classics (12 Voices)
  { id: 'aura-angus-en', name: 'Angus', gender: 'Male', accent: 'Irish', tier: 'Aura 1', style: 'Irish • Casual, Friendly, Patient' },
  { id: 'aura-orion-en', name: 'Orion', gender: 'Male', accent: 'American', tier: 'Aura 1', style: 'American • Approachable, Comfortable, Calm' },
  { id: 'aura-arcas-en', name: 'Arcas', gender: 'Male', accent: 'American', tier: 'Aura 1', style: 'American • Natural, Smooth, Clear' },
  { id: 'aura-perseus-en', name: 'Perseus', gender: 'Male', accent: 'American', tier: 'Aura 1', style: 'American • Expressive, Melodic, Charismatic' },
  { id: 'aura-orpheus-en', name: 'Orpheus', gender: 'Male', accent: 'American', tier: 'Aura 1', style: 'American • Clear, Trustworthy, Professional' },
  { id: 'aura-helios-en', name: 'Helios', gender: 'Male', accent: 'British', tier: 'Aura 1', style: 'British • Positive, Comfortable, Polite' },
  { id: 'aura-zeus-en', name: 'Zeus', gender: 'Male', accent: 'American', tier: 'Aura 1', style: 'American • Deep, Trustworthy, Smooth' },
  { id: 'aura-asteria-en', name: 'Asteria', gender: 'Female', accent: 'American', tier: 'Aura 1', style: 'American • Clear, Confident, Knowledgeable' },
  { id: 'aura-luna-en', name: 'Luna', gender: 'Female', accent: 'American', tier: 'Aura 1', style: 'American • Young Adult • Friendly, Natural, Engaging' },
  { id: 'aura-stella-en', name: 'Stella', gender: 'Female', accent: 'American', tier: 'Aura 1', style: 'American • Raspy, Engaging, Cheerful' },
  { id: 'aura-athena-en', name: 'Athena', gender: 'Female', accent: 'British', tier: 'Aura 1', style: 'British • Smooth, Calm, Professional' },
  { id: 'aura-hera-en', name: 'Hera', gender: 'Female', accent: 'American', tier: 'Aura 1', style: 'American • Deep, Smooth, Warm' }
];
