"use client";

import React, { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { Heart, Sparkles, Moon, Compass } from "lucide-react";

type Behavior = "ACTIVE" | "SLEEPING" | "TRACKING";

interface BonoPetProps {
  mood?: "HAPPY" | "CALM" | "LISTENING" | "SAD" | "ALERT";
}

// Fixed Golden Retriever colors for Bono
const BONO_COLORS = {
  body: "#fbbf24",     // amber-400
  chest: "#fef08a",    // yellow-200
  ears: "#d97706",     // dark amber
  snout: "#fef08a",
  eyeColor: "#1e293b",
  noseColor: "#1e293b"
};

const BONO_REACTIONS = {
  HAPPY: [
    "*wags tail furiously* Woof! I believe in you, bhai!",
    "*pant pant* Ready for another study session when you are!",
    "*licks your screen* Don't stress, you are working so hard!"
  ],
  CALM: [
    "*soft sigh* Just breathe. Ranks don't define you, friend.",
    "*rests head on your lap* A quick chai break is always a good idea.",
    "*yawns peacefully* Let's take it one small step at a time."
  ],
  LISTENING: [
    "*tilts head* Go on, dump all that exam tension here. I'm listening.",
    "*ears perk up* Backlogs? Don't worry, we'll sort them out leaf by leaf.",
    "*looks at you attentively* Tell me everything, yaar."
  ],
  SAD: [
    "*whispers* I know it's heavy right now. I'm right here with you.",
    "*nuzzles you gently* Mummy-papa's expectations feel heavy, huh? It's okay.",
    "*sits close to your feet* Let's sit together in silence. You aren't alone."
  ],
  ALERT: [
    "*stands guard* Your safety is all that matters. Please talk to someone.",
    "*looks up with deep care* Exams are just a small part of life. You are precious.",
    "*soft nudge* Let's take a pause. Please connect with the helplines."
  ]
};

export default function BonoPet({ mood = "HAPPY" }: BonoPetProps) {
  const [behavior, setBehavior] = useState<Behavior>("ACTIVE");
  const [petCount, setPetCount] = useState(0);
  const [bubbleText, setBubbleText] = useState("");
  const [isWagging, setIsWagging] = useState(false);

  // SVG Refs for GSAP
  const headRef = useRef<SVGGElement>(null);
  const leftEarRef = useRef<SVGPathElement>(null);
  const rightEarRef = useRef<SVGPathElement>(null);
  const tailRef = useRef<SVGPathElement>(null);
  const tongueRef = useRef<SVGPathElement>(null);
  const leftEyeRef = useRef<SVGCircleElement>(null);
  const rightEyeRef = useRef<SVGCircleElement>(null);
  const leftEyeIrisRef = useRef<SVGCircleElement>(null);
  const rightEyeIrisRef = useRef<SVGCircleElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load mood speech bubbles
  useEffect(() => {
    if (behavior === "SLEEPING") {
      setBubbleText("*softly snores* Zzz... Zzz...");
      return;
    }
    const list = BONO_REACTIONS[mood] || BONO_REACTIONS.HAPPY;
    setBubbleText(list[Math.floor(Math.random() * list.length)]);
  }, [mood, behavior]);

  // Ambient animations handler
  useEffect(() => {
    if (behavior === "SLEEPING") {
      if (!headRef.current || !tailRef.current) return;
      // Sleeping breathing loop (head bobs slowly, tail static)
      const sleepBob = gsap.to(headRef.current, {
        y: 4,
        scaleY: 0.96,
        transformOrigin: "bottom center",
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
      const tailQuiet = gsap.to(tailRef.current, {
        rotation: -5,
        transformOrigin: "bottom center",
        duration: 1
      });

      return () => {
        sleepBob.kill();
        tailQuiet.kill();
      };
    }

    if (!tailRef.current || !leftEarRef.current || !rightEarRef.current || !headRef.current) return;

    // Normal active tail wagging
    const tailWag = gsap.to(tailRef.current, {
      rotation: mood === "HAPPY" ? 25 : 10,
      transformOrigin: "bottom center",
      duration: mood === "HAPPY" ? 0.15 : 0.4,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });

    // Ambient ear twitches
    const earTwitch = gsap.timeline({ repeat: -1, repeatDelay: 5 });
    earTwitch
      .to([leftEarRef.current, rightEarRef.current], {
        rotation: 6,
        transformOrigin: "top center",
        duration: 0.12,
        yoyo: true,
        repeat: 3,
      })
      .to(headRef.current, {
        rotation: mood === "LISTENING" ? 4 : 0,
        transformOrigin: "bottom center",
        duration: 0.6,
      });

    return () => {
      tailWag.kill();
      earTwitch.kill();
    };
  }, [mood, behavior]);

  // Mouse move listener for tracking behavior
  useEffect(() => {
    if (behavior !== "TRACKING") {
      // Reset eyes position safely
      if (leftEyeIrisRef.current && rightEyeIrisRef.current) {
        gsap.to([leftEyeIrisRef.current, rightEyeIrisRef.current], { x: 0, y: 0, duration: 0.3 });
      }
      if (headRef.current) {
        gsap.to(headRef.current, { rotation: 0, x: 0, y: 0, duration: 0.3 });
      }
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !leftEyeIrisRef.current || !rightEyeIrisRef.current || !headRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Get offset values normalized
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      // Limit iris travel to 3.5px max
      const maxIrisTravel = 3.5;
      const ix = (dx / dist) * maxIrisTravel;
      const iy = (dy / dist) * maxIrisTravel;

      // Limit head rotation to 8deg max
      const maxHeadRotation = 8;
      const headRot = Math.max(-maxHeadRotation, Math.min(maxHeadRotation, (dx / rect.width) * maxHeadRotation * 2));
      
      gsap.to([leftEyeIrisRef.current, rightEyeIrisRef.current], {
        x: ix,
        y: iy,
        duration: 0.1,
        ease: "power1.out"
      });

      gsap.to(headRef.current, {
        rotation: headRot,
        x: Math.max(-5, Math.min(5, dx * 0.03)),
        y: Math.max(-5, Math.min(5, dy * 0.03)),
        transformOrigin: "bottom center",
        duration: 0.2,
        ease: "power1.out"
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [behavior]);

  // Pet action triggers squash/stretch animations
  const handlePet = () => {
    if (behavior === "SLEEPING") {
      // Wake up Bono!
      setBehavior("ACTIVE");
      setBubbleText("*yawns and stretches* Woof! Thanks for waking me up, friend! Let's get to work.");
      gsap.fromTo(bubbleRef.current, 
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "back.out" }
      );
      return;
    }

    setPetCount((prev) => prev + 1);
    
    // Choose random happy response
    const list = BONO_REACTIONS.HAPPY;
    setBubbleText(list[Math.floor(Math.random() * list.length)]);
    setIsWagging(true);

    const tl = gsap.timeline();
    tl.to(headRef.current, {
      y: 10,
      scaleY: 0.9,
      duration: 0.1,
      ease: "power2.out",
    })
    .to(tongueRef.current, {
      scaleY: 1.5,
      transformOrigin: "top center",
      duration: 0.12,
    })
    .to(headRef.current, {
      y: 0,
      scaleY: 1,
      duration: 0.3,
      ease: "bounce.out",
    })
    .to(tongueRef.current, {
      scaleY: 1,
      duration: 0.2,
    });

    gsap.to(tailRef.current, {
      rotation: 35,
      transformOrigin: "bottom center",
      duration: 0.08,
      repeat: 16,
      yoyo: true,
      ease: "power1.inOut",
      onComplete: () => setIsWagging(false)
    });

    gsap.fromTo(bubbleRef.current, 
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
    );
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center select-none relative p-4 w-full">
      
      {/* Speech Bubble */}
      <div 
        ref={bubbleRef}
        className="mb-4 bg-brand-cream text-brand-slate text-xs font-semibold py-2.5 px-4 rounded-2xl shadow-xl max-w-xs relative border border-amber-100 min-h-[40px] flex items-center justify-center text-center"
      >
        <p className="italic">{bubbleText}</p>
        <div className="absolute w-3 h-3 bg-brand-cream border-r border-b border-amber-100 transform rotate-45 bottom-[-6px] left-1/2 translate-x-[-50%]"></div>
      </div>

      {/* Floating Zzz for Sleeping state */}
      {behavior === "SLEEPING" && (
        <div className="absolute top-[80px] left-[55%] pointer-events-none flex flex-col font-mono text-amber-300 font-black animate-pulse text-xs gap-1">
          <span className="animate-bounce delay-100">Z</span>
          <span className="animate-bounce delay-300 text-sm ml-2">z</span>
          <span className="animate-bounce delay-500 text-base ml-4">z</span>
        </div>
      )}

      {/* Bono SVG Character (Always Classic Golden Retriever) */}
      <div className="relative cursor-pointer" onClick={handlePet} title="Click to pet Bono!">
        <svg width="190" height="190" viewBox="0 0 200 200" className="drop-shadow-2xl">
          {/* Shadow */}
          <ellipse cx="100" cy="185" rx="70" ry="10" fill="rgba(15, 23, 42, 0.45)" />

          {/* Tail */}
          <path
            ref={tailRef}
            d="M 125 155 C 145 130, 175 140, 185 110"
            stroke={BONO_COLORS.body}
            strokeWidth="13"
            strokeLinecap="round"
            fill="none"
          />

          {/* Body */}
          <ellipse cx="100" cy="150" rx="42" ry="38" fill={BONO_COLORS.body} />
          <ellipse cx="100" cy="150" rx="28" ry="28" fill={BONO_COLORS.chest} />

          {/* Head & Face Group */}
          <g ref={headRef}>
            {/* Floppy Left Ear */}
            <path
              ref={leftEarRef}
              d="M 60 70 C 40 70, 30 115, 45 125 C 55 130, 70 100, 70 75 Z"
              fill={BONO_COLORS.ears}
            />

            {/* Floppy Right Ear */}
            <path
              ref={rightEarRef}
              d="M 140 70 C 160 70, 170 115, 155 125 C 145 130, 130 100, 130 75 Z"
              fill={BONO_COLORS.ears}
            />

            {/* Head Base */}
            <circle cx="100" cy="85" r="40" fill={BONO_COLORS.body} />

            {/* Eyes container */}
            <g>
              {/* Outer eyes (White rims if sleeping, otherwise standard circles) */}
              {behavior === "SLEEPING" ? (
                <>
                  {/* Closed sleeping arcs */}
                  <path d="M 80 80 Q 85 85 90 80" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <path d="M 110 80 Q 115 85 120 80" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                </>
              ) : (
                <>
                  {/* Left Eye */}
                  <circle ref={leftEyeRef} cx="85" cy="80" r="5" fill="#ffffff" />
                  <circle ref={leftEyeIrisRef} cx="85" cy="80" r="3.5" fill={BONO_COLORS.eyeColor} />
                  
                  {/* Right Eye */}
                  <circle ref={rightEyeRef} cx="115" cy="80" r="5" fill="#ffffff" />
                  <circle ref={rightEyeIrisRef} cx="115" cy="80" r="3.5" fill={BONO_COLORS.eyeColor} />

                  {/* Highlights */}
                  <circle cx="83.5" cy="78.5" r="1" fill="#ffffff" />
                  <circle cx="113.5" cy="78.5" r="1" fill="#ffffff" />
                </>
              )}
            </g>

            {/* Snout */}
            <ellipse cx="100" cy="98" rx="18" ry="12" fill={BONO_COLORS.snout} />

            {/* Nose (Heart Shape) */}
            <path
              d="M 100 96 C 97 92, 93 92, 96 97 C 98 100, 100 102, 100 102 C 100 102, 102 100, 104 97 C 107 92, 103 92, 100 96 Z"
              fill={BONO_COLORS.noseColor}
            />

            {/* Mouth Line */}
            <path
              d="M 96 103 C 98 105, 100 105, 104 103"
              stroke="#1e293b"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />

            {/* Tongue (doesn't render if sleeping) */}
            {behavior !== "SLEEPING" && (
              <path
                ref={tongueRef}
                d="M 97 104 C 97 113, 103 113, 103 104 Z"
                fill="#f43f5e"
              />
            )}
          </g>

          {/* Front Paws */}
          <circle cx="76" cy="180" r="11" fill={BONO_COLORS.body} />
          <circle cx="124" cy="180" r="11" fill={BONO_COLORS.body} />
          <circle cx="76" cy="180" r="8" fill={BONO_COLORS.chest} />
          <circle cx="124" cy="180" r="8" fill={BONO_COLORS.chest} />
        </svg>
      </div>

      {/* Interactive Controls (Behavior Modes Only) */}
      <div className="mt-4 w-full flex flex-col gap-3.5 bg-[var(--input-bg)] p-4 border border-[var(--input-border)] rounded-2xl transition-colors duration-300">
        
        {/* Behavior / Mode Selector */}
        <div>
          <span className="block text-3xs uppercase font-bold text-[var(--text-muted)] tracking-wider mb-2 text-center">Bono's Mode</span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setBehavior("ACTIVE")}
              className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-[9px] font-bold ${
                behavior === "ACTIVE" 
                  ? "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-400 dark:border-indigo-500 shadow-sm" 
                  : "bg-[var(--bg-color)]/30 text-[var(--text-muted)] border-[var(--input-border)] hover:text-[var(--title-color)]"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Active</span>
            </button>

            <button
              onClick={() => setBehavior("SLEEPING")}
              className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-[9px] font-bold ${
                behavior === "SLEEPING" 
                  ? "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-400 dark:border-purple-500 shadow-sm" 
                  : "bg-[var(--bg-color)]/30 text-[var(--text-muted)] border-[var(--input-border)] hover:text-[var(--title-color)]"
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Nap Mode</span>
            </button>

            <button
              onClick={() => setBehavior("TRACKING")}
              className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-[9px] font-bold ${
                behavior === "TRACKING" 
                  ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-500 shadow-sm" 
                  : "bg-[var(--bg-color)]/30 text-[var(--text-muted)] border-[var(--input-border)] hover:text-[var(--title-color)]"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Track cursor</span>
            </button>
          </div>
        </div>

        {/* Pet Counter */}
        <div className="flex justify-between items-center px-1 text-[10px] text-[var(--text-muted)] border-t border-[var(--input-border)] pt-2.5 font-medium transition-colors duration-300">
          <button 
            onClick={handlePet}
            className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
          >
            <Heart className={`w-3 h-3 text-rose-500 ${isWagging ? "animate-ping" : ""}`} />
            Pet Bono
          </button>
          <span>Petted: {petCount} times! 🐾</span>
        </div>

      </div>

    </div>
  );
}
