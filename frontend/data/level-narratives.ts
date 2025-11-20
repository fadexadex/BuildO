export interface LevelNarrative {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  character: string;
  dialogue: string[];
  visualMetaphor: string;
}

export const levelNarratives: Record<string, LevelNarrative> = {
  "anonymous-voting": {
    id: "anonymous-voting",
    title: "The Democratic Dilemma",
    subtitle: "Chapter 1: Trust vs. Transparency",
    description: "In the village of Zkaria, an election is being held. The villagers want to vote for their new leader, but they are afraid of retaliation if their vote is revealed.",
    character: "Elder Zeno",
    dialogue: [
      "Welcome, young cryptographer. Our village faces a crisis.",
      "We must choose a new leader, but fear silences our people.",
      "If we vote openly, the powerful may punish those who oppose them.",
      "If we vote secretly with a ballot box, how do we know the count is fair?",
      "You possess the ancient knowledge of Zero-Knowledge. Can you build a system where every vote is counted, but no voter is revealed?"
    ],
    visualMetaphor: "A glass ballot box that turns opaque when a vote is cast, yet the tally counter remains visible to all."
  },
  "privacy-auth": {
    id: "privacy-auth",
    title: "The Identity Paradox",
    subtitle: "Chapter 2: Security vs. Privacy",
    description: "The Vault of Secrets requires proof of citizenship to enter, but the guards demand to see your ID card, which contains your home address.",
    character: "Guardian Cipher",
    dialogue: [
      "Halt! Only citizens of Zkaria may enter the Vault.",
      "Show me your papers. I need to see your name, address, and birthdate to verify you.",
      "What? You refuse? You say your privacy is a right?",
      "Interesting... Is there a way you can prove you are a citizen without showing me your papers?",
      "Show me this 'Zero-Knowledge Proof' of identity you speak of."
    ],
    visualMetaphor: "A magical door that opens only when a specific melody is hummed, proving knowledge of the song without teaching it to the listener."
  },
  "color-game": {
    id: "color-game",
    title: "The Chromatic Challenge",
    subtitle: "Tutorial: The Basics of Proof",
    description: "Learn the fundamental concept of Zero-Knowledge Proofs through a simple color-blindness test.",
    character: "Professor Prism",
    dialogue: [
      "Let's start with the basics. Imagine I am color-blind.",
      "I have two balls, one red and one green. To me, they look identical.",
      "You claim they are different colors. I don't believe you.",
      "I will hide them behind my back and maybe switch them.",
      "If you can consistently tell me if I switched them, I must believe you can see the difference, even if I cannot."
    ],
    visualMetaphor: "Two identical-looking spheres that glow with different auras only to the prover."
  }
};
