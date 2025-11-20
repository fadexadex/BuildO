"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuizState, QuizType } from "@/hooks/use-quiz-state";
import { CheckCircle2, XCircle, HelpCircle, ArrowRight } from "lucide-react";
import { audioSystem } from "@/lib/audio-system";
import { triggerHaptic } from "@/lib/haptics";
import { useEffect } from "react";

interface QuizModuleProps {
  levelId: string;
  type: QuizType;
  onComplete: (score: number) => void;
  onSkip?: () => void;
}

export function QuizModule({ levelId, type, onComplete, onSkip }: QuizModuleProps) {
  const {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    selectedOption,
    setSelectedOption,
    isAnswered,
    submitAnswer,
    nextQuestion,
    showExplanation,
    hasQuestions
  } = useQuizState({ levelId, type, onComplete });

  // If no questions, complete immediately
  useEffect(() => {
    if (!hasQuestions) {
      onComplete(0);
    }
  }, [hasQuestions, onComplete]);

  if (!hasQuestions) return null;

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    audioSystem.play("click", 0.2);
    triggerHaptic("light");
  };

  const handleSubmit = () => {
    submitAnswer();
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    if (isCorrect) {
      audioSystem.play("success", 0.5);
      triggerHaptic("success");
    } else {
      audioSystem.play("error", 0.3);
      triggerHaptic("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-sm p-4">
      <Card className="w-full max-w-xl bg-slate-900 border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              {type === 'pre' ? 'Knowledge Check' : 'Concept Verification'}
            </h2>
            <p className="text-slate-400 text-sm">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
          </div>
          {type === 'pre' && onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-slate-500">
              Skip
            </Button>
          )}
        </div>

        {/* Question */}
        <div className="p-6 flex-1 overflow-y-auto">
          <h3 className="text-lg text-slate-200 font-medium mb-6">
            {currentQuestion.text}
          </h3>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              let optionClass = "w-full justify-start text-left p-4 h-auto border-slate-700 hover:bg-slate-800 hover:text-white transition-all";
              
              if (isAnswered) {
                if (index === currentQuestion.correctIndex) {
                  optionClass = "w-full justify-start text-left p-4 h-auto bg-green-900/30 border-green-500/50 text-green-200";
                } else if (index === selectedOption) {
                  optionClass = "w-full justify-start text-left p-4 h-auto bg-red-900/30 border-red-500/50 text-red-200";
                } else {
                  optionClass = "w-full justify-start text-left p-4 h-auto border-slate-800 text-slate-500 opacity-50";
                }
              } else if (selectedOption === index) {
                optionClass = "w-full justify-start text-left p-4 h-auto bg-cyan-900/30 border-cyan-500 text-cyan-100 ring-1 ring-cyan-500";
              }

              return (
                <Button
                  key={index}
                  variant="outline"
                  className={optionClass}
                  onClick={() => handleOptionSelect(index)}
                  disabled={isAnswered}
                >
                  <div className="flex items-center w-full">
                    <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center mr-3 text-xs shrink-0">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {isAnswered && index === currentQuestion.correctIndex && (
                      <CheckCircle2 className="w-5 h-5 text-green-400 ml-2 shrink-0" />
                    )}
                    {isAnswered && index === selectedOption && index !== currentQuestion.correctIndex && (
                      <XCircle className="w-5 h-5 text-red-400 ml-2 shrink-0" />
                    )}
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
              <h4 className="text-sm font-semibold text-slate-300 mb-1">Explanation:</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          {!isAnswered ? (
            <Button 
              onClick={handleSubmit} 
              disabled={selectedOption === null}
              className="bg-cyan-600 hover:bg-cyan-500 text-white min-w-[120px]"
            >
              Submit Answer
            </Button>
          ) : (
            <Button 
              onClick={nextQuestion}
              className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[120px]"
            >
              {currentQuestionIndex < totalQuestions - 1 ? (
                <>Next Question <ArrowRight className="w-4 h-4 ml-2" /></>
              ) : (
                <>Complete Quiz <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
