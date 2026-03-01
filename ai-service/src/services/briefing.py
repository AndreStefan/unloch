import json
import os
from anthropic import Anthropic
from src.prompts.system_prompt import BRIEFING_GENERATION_PROMPT

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


def generate_briefing(data: dict) -> str:
    """
    Generate a pre-session briefing for a therapist.

    Input data should contain:
    - messages: list of message dicts (content, type, createdAt)
    - moodLogs: list of mood log dicts (score, note, createdAt)
    - triggeredRules: list of rule trigger dicts (ruleName, count, lastTriggered)
    - crisisEvents: list of crisis event dicts (detectionLayer, confidence, createdAt, status)
    - assignments: list of assignment dicts (title, type, status, completedAt)
    - patientName: str
    - periodStart: str (ISO date)
    - periodEnd: str (ISO date)
    """

    # Build structured input for Claude
    sections = []

    sections.append(f"Patient: {data.get('patientName', 'Unknown')}")
    sections.append(f"Period: {data.get('periodStart', 'N/A')} to {data.get('periodEnd', 'N/A')}")

    # Messages summary
    messages = data.get("messages", [])
    if messages:
        sections.append(f"\n## Messages ({len(messages)} total)")
        for msg in messages[-50:]:  # Last 50 messages max
            sections.append(f"- [{msg.get('type', 'unknown')}] {msg.get('createdAt', '')}: {msg.get('content', '')[:200]}")
    else:
        sections.append("\n## Messages\nNo messages during this period.")

    # Mood logs
    mood_logs = data.get("moodLogs", [])
    if mood_logs:
        sections.append(f"\n## Mood Logs ({len(mood_logs)} entries)")
        for log in mood_logs:
            note_part = f" — Note: {log.get('note', '')}" if log.get("note") else ""
            sections.append(f"- Score: {log.get('score', 'N/A')}/10 on {log.get('createdAt', '')}{note_part}")
    else:
        sections.append("\n## Mood Logs\nNo mood logs during this period.")

    # Triggered rules
    triggered_rules = data.get("triggeredRules", [])
    if triggered_rules:
        sections.append(f"\n## Rules Triggered ({len(triggered_rules)} rules)")
        for rule in triggered_rules:
            sections.append(f"- \"{rule.get('ruleName', 'Unknown')}\" triggered {rule.get('count', 0)} time(s), last: {rule.get('lastTriggered', '')}")
    else:
        sections.append("\n## Rules Triggered\nNo rules triggered during this period.")

    # Crisis events
    crisis_events = data.get("crisisEvents", [])
    if crisis_events:
        sections.append(f"\n## Crisis Events ({len(crisis_events)} events)")
        for event in crisis_events:
            sections.append(
                f"- {event.get('createdAt', '')}: Detection={event.get('detectionLayer', 'unknown')}, "
                f"Confidence={event.get('confidence', 'N/A')}, Status={event.get('status', 'unknown')}"
            )
    else:
        sections.append("\n## Crisis Events\nNo crisis events during this period.")

    # Assignments
    assignments = data.get("assignments", [])
    if assignments:
        completed = [a for a in assignments if a.get("status") == "completed"]
        pending = [a for a in assignments if a.get("status") == "pending"]
        skipped = [a for a in assignments if a.get("status") == "skipped"]
        sections.append(f"\n## Assignments ({len(assignments)} total: {len(completed)} completed, {len(pending)} pending, {len(skipped)} skipped)")
        for a in assignments:
            sections.append(f"- [{a.get('type', 'task')}] \"{a.get('title', 'Untitled')}\" — {a.get('status', 'unknown')}")
    else:
        sections.append("\n## Assignments\nNo assignments during this period.")

    user_input = "\n".join(sections)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        temperature=0.3,
        system=BRIEFING_GENERATION_PROMPT,
        messages=[{"role": "user", "content": user_input}],
    )

    return response.content[0].text.strip()
