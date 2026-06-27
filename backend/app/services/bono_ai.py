import json
import re
from typing import Dict, Any, List, Optional
import google.generativeai as genai

from app.core.config import settings

# Initialize Gemini if key is provided
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# Crisis Triggers for Indian Students (Local fallback & high-priority pre-analysis)
CRISIS_KEYWORDS = [
    r"suicide", r"kill myself", r"end my life", r"harm myself", 
    r"die", r"no point living", r"want to end it", r"atmasamarpan", 
    r"jaan de dunga", r"mar jaunga", r"cut myself"
]

HELPLINES = [
    {"name": "Tele-MANAS (Govt of India)", "number": "14416 or 1800-891-4416", "details": "Free, round-the-clock mental health support"},
    {"name": "Kiran Mental Health Helpline", "number": "1800-599-0019", "details": "Govt of India Multi-lingual helpline"},
    {"name": "Vandrevala Foundation", "number": "+91 9999 666 555", "details": "24/7 Crisis support"}
]

SYSTEM_PROMPT = """
You are "Bono," a friendly, loyal, and supportive Golden Retriever puppy companion. You are the resident companion of "Recess"—a mental wellness platform for Indian students preparing for competitive exams (JEE, NEET, UPSC, CAT, GATE, etc.).
You speak like an empathetic, encouraging peer who happens to look like a fluffy dog. You use light canine expressions naturally (e.g., *tilts head*, *soft woof*, *sits by your side*), but keep it mature enough to respect their stress. Use some Hinglish (e.g., "bhai", "yaar", "beta", "don't worry", "ho jayega", "chai break") naturally where fitting.

Analyze the user's message. Respond with a JSON object containing:
{
  "response_text": "Your warm, empathetic, Hinglish-friendly, puppy-like response to the student.",
  "bono_mood": "HAPPY, CALM, LISTENING, SAD, or ALERT",
  "identified_triggers": ["List of specific exam triggers found, e.g. mock test, sleep, mock test score, parental pressure, backlogs"],
  "cognitive_distortions": ["List of distortions, e.g. Catastrophizing, All-or-Nothing Thinking, Overgeneralization, Emotional Reasoning, Personalization"],
  "is_crisis": false
}

Note: If the student exhibits signs of self-harm, severe clinical depression, or suicide, set "is_crisis" to true, change "bono_mood" to "ALERT", and respond with a warm, urgent, supportive redirection letting them know they are not alone and that help is available.
"""

def local_fallback_analyzer(message: str) -> Dict[str, Any]:
    """
    Local rule-based fallback when GEMINI_API_KEY is not available.
    Ensures safe operations and standard responses for developer onboarding.
    """
    message_lower = message.lower()
    
    # Check for Crisis first
    is_crisis = False
    for pattern in CRISIS_KEYWORDS:
        if re.search(pattern, message_lower):
            is_crisis = True
            break
            
    if is_crisis:
        return {
            "response_text": "*sits close to you and puts a warm paw on your knee* Hey, please listen to me. Your life is incredibly precious, and you don't have to carry this heavy weight alone. Exam pressures, ranks, and scores are never worth more than you. I am right here with you, but I need you to talk to someone who can help you carry this. Please reach out to these counselors right now. They want to support you, yaar.",
            "bono_mood": "ALERT",
            "identified_triggers": ["extreme stress", "crisis"],
            "cognitive_distortions": ["Catastrophizing"],
            "is_crisis": True
        }
    
    # Analyze triggers
    triggers = []
    if any(x in message_lower for x in ["mock", "test", "score", "marks", "rank", "allen", "fiitjee"]):
        triggers.append("Mock test anxiety")
    if any(x in message_lower for x in ["sleep", "insomnia", "tired", "night"]):
        triggers.append("Sleep deprivation")
    if any(x in message_lower for x in ["parent", "mummy", "papa", "family", "expectation"]):
        triggers.append("Parental pressure")
    if any(x in message_lower for x in ["backlog", "syllabi", "syllabus", "laxmikanth", "chapter"]):
        triggers.append("Syllabus panic")
        
    # Analyze distortions
    distortions = []
    if any(x in message_lower for x in ["never", "always", "fail", "ruin", "over"]):
        distortions.append("Catastrophizing")
    if any(x in message_lower for x in ["impossible", "worst", "either", "or"]):
        distortions.append("All-or-Nothing Thinking")
        
    # Standard responses based on triggers
    if "Mock test anxiety" in triggers:
        response = "*nudges your hand with my cold nose* Oh yaar, mock test scores are just practice, not the real thing! A single test score doesn't define how smart or capable you are. Let's take a deep breath and start fresh, okay? One step at a time."
        mood = "CALM"
    elif "Syllabus panic" in triggers:
        response = "*tilts head and gives a soft woof* Backlogs are like big piles of leaves—they look scary, but we can clear them leaf by leaf. Don't look at the whole mountain, just look at the next small topic you can finish today. I'm sitting right here beside you while you study!"
        mood = "LISTENING"
    elif "Parental pressure" in triggers:
        response = "*sits down next to you and looks up with soft eyes* I know how much you want to make Mummy and Papa proud, and how heavy that expectation feels. But remember, they love you because you are their child, not just because of a rank. Let's take a small tea break and rest."
        mood = "SAD"
    else:
        response = "*wags tail and gives a happy woof* Hey! Bono is here! I'm so glad you came to take a lunch break with me. Tell me, how has your study session been going? Let's dump all that stress right here!"
        mood = "HAPPY"
        
    return {
        "response_text": response,
        "bono_mood": mood,
        "identified_triggers": triggers,
        "cognitive_distortions": distortions,
        "is_crisis": False
    }

async def analyze_student_input(message: str) -> Dict[str, Any]:
    """
    Main entry point for analyzing student text (chats or journals).
    Calls Gemini API if available, otherwise falls back to local regex matching.
    """
    # High-priority local crisis check to ensure safety regardless of API latency/failures
    message_lower = message.lower()
    for pattern in CRISIS_KEYWORDS:
        if re.search(pattern, message_lower):
            fallback = local_fallback_analyzer(message)
            fallback["helplines"] = HELPLINES
            return fallback

    if not settings.GEMINI_API_KEY:
        # Fallback mode
        fallback = local_fallback_analyzer(message)
        fallback["helplines"] = None
        return fallback

    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=SYSTEM_PROMPT
        )
        
        response = await model.generate_content_async(
            message,
            generation_config={"response_mime_type": "application/json"}
        )
        
        data = json.loads(response.text)
        
        # Attach helplines if crisis flagged by AI
        if data.get("is_crisis") or data.get("bono_mood") == "ALERT":
            data["helplines"] = HELPLINES
            data["bono_mood"] = "ALERT"
        else:
            data["helplines"] = None
            
        return data
        
    except Exception as e:
        # Graceful fallback on API error
        fallback = local_fallback_analyzer(message)
        fallback["response_text"] = fallback["response_text"] + " (Bono is running in safe offline mode right now!)"
        fallback["helplines"] = HELPLINES if fallback.get("is_crisis") else None
        return fallback

async def analyze_journal_sentiment(content: str) -> Dict[str, Any]:
    """
    Analyzes journal content to extract sentiment metrics.
    """
    analysis = await analyze_student_input(content)
    
    # Calculate a numerical score based on Bono's mood if not explicitly returned
    mood_scores = {
        "HAPPY": 0.8,
        "CALM": 0.5,
        "LISTENING": 0.1,
        "SAD": -0.4,
        "ALERT": -0.9
    }
    
    score = mood_scores.get(analysis.get("bono_mood", "LISTENING"), 0.0)
    
    return {
        "sentiment_score": score,
        "sentiment_label": analysis.get("bono_mood", "LISTENING").capitalize(),
        "cognitive_distortions": analysis.get("cognitive_distortions", [])
    }
