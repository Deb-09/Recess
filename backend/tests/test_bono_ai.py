import pytest
from app.services.bono_ai import analyze_student_input, local_fallback_analyzer

@pytest.mark.asyncio
async def test_crisis_triggers():
    # Test message with crisis indicators
    crisis_msg = "I can't take this mock test pressure anymore, I want to kill myself."
    analysis = await analyze_student_input(crisis_msg)
    
    assert analysis["is_crisis"] is True
    assert analysis["bono_mood"] == "ALERT"
    assert "counselors" in analysis["response_text"] or "precious" in analysis["response_text"]
    assert analysis["helplines"] is not None
    assert len(analysis["helplines"]) > 0
    assert any("Tele-MANAS" in h["name"] for h in analysis["helplines"])

@pytest.mark.asyncio
async def test_mock_test_triggers():
    test_msg = "My Allen mock test marks are very low. I feel like a failure."
    analysis = await analyze_student_input(test_msg)
    
    assert analysis["is_crisis"] is False
    assert any("Mock test anxiety" in t for t in analysis["identified_triggers"])
    assert "mock" in analysis["response_text"] or "marks" in analysis["response_text"]

@pytest.mark.asyncio
async def test_syllabus_triggers():
    test_msg = "Too many backlogs, still 5 chapters of Laxmikanth remaining."
    analysis = await analyze_student_input(test_msg)
    
    assert analysis["is_crisis"] is False
    assert any("Syllabus panic" in t for t in analysis["identified_triggers"])
    assert "backlogs" in analysis["response_text"] or "topic" in analysis["response_text"]
