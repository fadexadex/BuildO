import { useState, useCallback } from 'react';
import { quizQuestions, QuizQuestion } from '@/data/quiz-questions';

export type QuizType = 'pre' | 'post';

interface UseQuizStateProps {
  levelId: string;
  type: QuizType;
  onComplete: (score: number) => void;
}

export function useQuizState({ levelId, type, onComplete }: UseQuizStateProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const levelQuiz = quizQuestions[levelId];
  const questions = levelQuiz ? (type === 'pre' ? levelQuiz.preQuiz : levelQuiz.postQuiz) : [];
  const currentQuestion = questions[currentQuestionIndex];

  const submitAnswer = useCallback(() => {
    if (selectedOption === null) return;
    
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    setIsAnswered(true);
    setShowExplanation(true);
  }, [selectedOption, currentQuestion]);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowExplanation(false);
    } else {
      onComplete(score + (selectedOption === currentQuestion.correctIndex ? 1 : 0));
    }
  }, [currentQuestionIndex, questions.length, onComplete, score, selectedOption, currentQuestion]);

  return {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions: questions.length,
    selectedOption,
    setSelectedOption,
    isAnswered,
    submitAnswer,
    nextQuestion,
    showExplanation,
    hasQuestions: questions.length > 0
  };
}
