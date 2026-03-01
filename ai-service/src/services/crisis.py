import json
import os
from anthropic import Anthropic
from src.prompts.system_prompt import CRISIS_DETECTION_PROMPT

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


def detect_crisis(message: str, context: list[str]) -> dict:
    """
    Layer 2 crisis classification via Claude.
    Called when Layer 1 keyword scan finds a moderate match.

    Returns: { is_crisis: bool, confidence: float, reasoning: str, detected_signals: list[str] }
    """
    context_block = ""
    if context:
        context_block = "Recent conversation context:\n" + "\n".join(
            f"- {msg}" for msg in context[-5:]
        )

    user_message = f"""{context_block}

Current patient message: {message}"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        temperature=0.0,
        system=CRISIS_DETECTION_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    # Parse the JSON response from Claude
    raw_text = response.content[0].text.strip()
    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        # If Claude didn't return valid JSON, bias toward crisis (safety first)
        result = {
            "is_crisis": True,
            "confidence": 0.8,
            "reasoning": f"Failed to parse AI response — escalating out of caution. Raw: {raw_text[:200]}",
            "detected_signals": ["parse_error_escalation"],
        }

    # Validate expected fields
    return {
        "is_crisis": bool(result.get("is_crisis", True)),
        "confidence": float(result.get("confidence", 0.8)),
        "reasoning": str(result.get("reasoning", "No reasoning provided")),
        "detected_signals": list(result.get("detected_signals", [])),
    }
