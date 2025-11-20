"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { levelNarratives } from "@/data/level-narratives";
import { ArrowRight, SkipForward, MessageSquare } from "lucide-react";
import { audioSystem } from "@/lib/audio-system";

interface LevelIntroProps {
  levelId: string;
  onComplete: () => void;
}

export function LevelIntro({ levelId, onComplete }: LevelIntroProps) {
  const narrative = levelNarratives[levelId];
  const [step, setStep] = useState(0);
  const [typingIndex, setTypingIndex] = useState(0);
  const [showFullText, setShowFullText] = useState(false);

  // If no narrative exists for this level, skip intro
  useEffect(() => {
    if (!narrative) {
      onComplete();
    }
  }, [narrative, onComplete]);

  if (!narrative) return null;

  const currentDialogue = narrative.dialogue[step];

  // Typing effect
  useEffect(() => {
    if (showFullText) {
      setTypingIndex(currentDialogue.length);
      return;
    }

    if (typingIndex < currentDialogue.length) {
      const timeout = setTimeout(() => {
        setTypingIndex((prev) => prev + 1);
        // Play subtle typing sound occasionally
        if (typingIndex % 3 === 0) {
          audioSystem.play("click", 0.1);
        }
      }, 30);
      return () => clearTimeout(timeout);
    }
  }, [typingIndex, currentDialogue, showFullText]);

  // Reset typing when step changes
  useEffect(() => {
    setTypingIndex(0);
    setShowFullText(false);
  }, [step]);

  const handleNext = () => {
    if (typingIndex < currentDialogue.length) {
      setShowFullText(true);
    } else {
      if (step < narrative.dialogue.length - 1) {
        setStep((prev) => prev + 1);
        audioSystem.play("click", 0.5);
      } else {
        audioSystem.play("success", 0.5);
        onComplete();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header with Title */}
        <div className="p-6 bg-gradient-to-r from-indigo-900/50 to-slate-900 border-b border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{narrative.title}</h2>
              <p className="text-cyan-400 font-mono text-sm">{narrative.subtitle}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-400 hover:text-white"
              onClick={onComplete}
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Skip Intro
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8 flex flex-col gap-6 min-h-[300px]">
          {/* Character & Visual Metaphor Placeholder */}
          <div className="flex items-center gap-6 mb-4">
            <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center border-2 border-indigo-500/50 shrink-0">
              <MessageSquare className="w-10 h-10 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-indigo-300">{narrative.character}</h3>
              <p className="text-slate-500 text-sm italic">Storyteller</p>
            </div>
          </div>

          {/* Dialogue Box */}
          <div 
            className="flex-1 bg-slate-950/50 rounded-lg p-6 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors"
            onClick={handleNext}
          >
            <p className="text-lg text-slate-200 leading-relaxed font-serif">
              {showFullText ? currentDialogue : currentDialogue.slice(0, typingIndex)}
              <span className="animate-pulse text-cyan-500">|</span>
            </p>
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-between items-center mt-auto">
            <div className="flex gap-2">
              {narrative.dialogue.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-8 bg-cyan-500" : i < step ? "w-2 bg-cyan-900" : "w-2 bg-slate-800"
                  }`}
                />
              ))}
            </div>
            
            <Button onClick={handleNext} className="bg-cyan-600 hover:bg-cyan-500 text-white">
              {step < narrative.dialogue.length - 1 ? (
                <>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Start Challenge <Zap className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

import { Zap } from "lucide-react";
