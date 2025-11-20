export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LevelQuiz {
  levelId: string;
  preQuiz: QuizQuestion[];
  postQuiz: QuizQuestion[];
}

export const quizQuestions: Record<string, LevelQuiz> = {
  "anonymous-voting": {
    levelId: "anonymous-voting",
    preQuiz: [
      {
        id: "av-pre-1",
        text: "In a traditional paper ballot, what ensures your vote is secret?",
        options: [
          "You sign your name on the ballot",
          "The ballot box is transparent",
          "You place an unmarked paper into a mixed box",
          "The election official watches you write"
        ],
        correctIndex: 2,
        explanation: "Anonymity comes from the inability to link a specific paper in the box back to the person who dropped it."
      },
      {
        id: "av-pre-2",
        text: "What is the main problem with digital voting without ZK proofs?",
        options: [
          "It's too fast",
          "Computers are expensive",
          "It's hard to prove the count is correct without revealing who voted for whom",
          "Internet connection is required"
        ],
        correctIndex: 2,
        explanation: "Centralized databases usually have to know who you are to verify your right to vote, creating a privacy risk."
      }
    ],
    postQuiz: [
      {
        id: "av-post-1",
        text: "What did the Zero-Knowledge Proof allow us to verify in this level?",
        options: [
          "Who exactly voted for Candidate A",
          "That the voter had a valid token without revealing which token it was",
          "The voter's home address",
          "The exact time the vote was cast"
        ],
        correctIndex: 1,
        explanation: "The ZK proof verified membership in the 'eligible voters' set (Merkle Tree) without revealing the specific leaf (identity)."
      },
      {
        id: "av-post-2",
        text: "Why is the 'Nullifier' important?",
        options: [
          "It deletes the vote",
          "It prevents double-voting by marking the token as used",
          "It nullifies the election results",
          "It hides the candidate's name"
        ],
        correctIndex: 1,
        explanation: "A nullifier is a unique hash generated from the private key that signals 'this credential has been used' without revealing the credential itself."
      }
    ]
  },
  "color-game": {
    levelId: "color-game",
    preQuiz: [],
    postQuiz: [
      {
        id: "cg-post-1",
        text: "In the color-blind example, why did the verifier (Professor) have to switch the balls randomly?",
        options: [
          "To confuse the prover",
          "To ensure the prover wasn't just guessing lucky",
          "To make the game longer",
          "Because he likes juggling"
        ],
        correctIndex: 1,
        explanation: "By repeating the random test many times, the probability of guessing correctly every time drops to near zero, proving actual knowledge."
      }
    ]
  }
};
