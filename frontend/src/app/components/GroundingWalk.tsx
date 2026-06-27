"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { Compass, Eye, Move, Volume2, Smile, Activity, Sparkles, ChevronRight, X } from "lucide-react";

interface GroundingWalkProps {
  onClose: () => void;
}

const STEPS = [
  {
    id: "breath",
    title: "1-Min Calming Breath",
    icon: Activity,
    instruction: "Follow the circle. Let's sync your breath before we take our walk. Inhale as it grows, exhale as it shrinks.",
    buttonText: "Ready for the walk"
  },
  {
    id: "5-sights",
    title: "5 Sights",
    icon: Eye,
    instruction: "Look around you. Name 5 things you can see right now (e.g. your textbook, a pen, your desk, a coffee mug, your watch).",
    buttonText: "Found them"
  },
  {
    id: "4-feels",
    title: "4 Feelings",
    icon: Move,
    instruction: "Focus on your body. Name 4 things you can feel physically (e.g. the hard chair beneath you, the cold desk, your feet on the floor, the breeze from the fan).",
    buttonText: "Felt them"
  },
  {
    id: "3-sounds",
    title: "3 Sounds",
    icon: Volume2,
    instruction: "Listen closely. Name 3 things you can hear (e.g. the hum of the fan, traffic outside, birds chirping, the ticking clock).",
    buttonText: "Heard them"
  },
  {
    id: "2-smells",
    title: "2 Smells",
    icon: Compass,
    instruction: "Sniff the air. Name 2 things you can smell (e.g. fresh tea/chai, pages of an old book, wood, rain).",
    buttonText: "Smelled them"
  },
  {
    id: "1-taste",
    title: "1 Taste",
    icon: Smile,
    instruction: "Focus on your mouth. Name 1 thing you can taste (e.g. the lingering taste of mint, tea, or just clean water).",
    buttonText: "Got it"
  },
  {
    id: "finish",
    title: "Walk Complete!",
    icon: Sparkles,
    instruction: "Your mind has returned to the present moment. You did it! You stepped away from the exam panic, and you are here now. Ready to continue?",
    buttonText: "Return to Recess"
  }
];

export default function GroundingWalk({ onClose }: GroundingWalkProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [breathText, setBreathText] = useState("Breathe In...");
  
  const circleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const step = STEPS[currentStepIndex];
  const StepIcon = step.icon;

  // Breathing Circle Animation (Looping)
  useEffect(() => {
    if (step.id !== "breath" || !circleRef.current) return;

    // Breathing sequence: Inhale 4s, Hold 2s, Exhale 4s, Hold 2s
    const tl = gsap.timeline({ repeat: -1 });
    
    tl.to(circleRef.current, {
      scale: 1.6,
      backgroundColor: "rgba(99, 102, 241, 0.4)",
      duration: 4,
      ease: "sine.inOut",
      onStart: () => setBreathText("Breathe In... (Inhale)"),
    })
    .to(circleRef.current, {
      duration: 2,
      onStart: () => setBreathText("Hold it..."),
    })
    .to(circleRef.current, {
      scale: 1.0,
      backgroundColor: "rgba(168, 85, 247, 0.2)",
      duration: 4,
      ease: "sine.inOut",
      onStart: () => setBreathText("Breathe Out... (Exhale)"),
    })
    .to(circleRef.current, {
      duration: 2,
      onStart: () => setBreathText("Rest..."),
    });

    return () => {
      tl.kill();
    };
  }, [currentStepIndex]);

  // Transition animations when step changes
  useEffect(() => {
    // Fade in text content
    gsap.fromTo(contentRef.current, 
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
    );

    // Progress Bar scaling
    const progressPercent = (currentStepIndex / (STEPS.length - 1)) * 100;
    gsap.to(progressRef.current, {
      width: `${progressPercent}%`,
      duration: 0.3,
      ease: "power1.out"
    });
  }, [currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="w-full max-w-lg glass-card p-6 md:p-8 flex flex-col items-center relative overflow-hidden border border-slate-700 shadow-2xl">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
          aria-label="Close grounding session"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Heading Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <StepIcon className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-display font-bold text-slate-100">{step.title}</h2>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full mb-8 relative">
          <div 
            ref={progressRef}
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-400 to-indigo-500 rounded-full"
            style={{ width: "0%" }}
          ></div>
        </div>

        {/* Content Area */}
        <div ref={contentRef} className="flex flex-col items-center w-full min-h-[220px]">
          
          {/* Custom Visual: Breathing Circle */}
          {step.id === "breath" && (
            <div className="relative w-48 h-48 flex items-center justify-center mb-8">
              {/* Outer pulsing circle */}
              <div 
                ref={circleRef}
                className="w-24 h-24 rounded-full bg-indigo-500/20 absolute flex items-center justify-center"
              ></div>
              {/* Inner core circle */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-indigo-500 flex items-center justify-center shadow-lg">
                <Compass className="w-8 h-8 text-slate-900 animate-spin-slow" />
              </div>
              
              {/* Breathing instruction text */}
              <span className="absolute bottom-[-16px] text-sm font-bold text-amber-400 tracking-wider font-mono">
                {breathText}
              </span>
            </div>
          )}

          {/* Senses Exercises Icons */}
          {step.id !== "breath" && step.id !== "finish" && (
            <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-8 shadow-inner">
              <StepIcon className="w-10 h-10 text-indigo-400" />
            </div>
          )}

          {/* Finish Screen Icon */}
          {step.id === "finish" && (
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8 shadow-inner animate-bounce">
              <Sparkles className="w-12 h-12 text-emerald-400" />
            </div>
          )}

          {/* Main instruction text */}
          <p className="text-center text-slate-300 text-base leading-relaxed max-w-sm mb-8" aria-live="polite">
            {step.instruction}
          </p>

        </div>

        {/* Next Control Action Button */}
        <button
          onClick={handleNext}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
        >
          {step.buttonText}
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Step indicator footer */}
        <span className="text-xs text-slate-500 font-medium mt-4">
          Step {currentStepIndex + 1} of {STEPS.length} • Taking a quick walk with Bono 🐾
        </span>

      </div>
    </div>
  );
}
