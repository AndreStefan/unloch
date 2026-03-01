from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from src.services.crisis import detect_crisis
from src.services.briefing import generate_briefing

load_dotenv()

app = FastAPI(title="Unloch AI Service", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "unloch-ai"}


# ── Crisis Detection ──

class CrisisDetectRequest(BaseModel):
    message: str
    context: list[str] = []


class CrisisDetectResponse(BaseModel):
    is_crisis: bool
    confidence: float
    reasoning: str
    detected_signals: list[str]


@app.post("/api/v1/crisis/detect", response_model=CrisisDetectResponse)
def crisis_detect(req: CrisisDetectRequest):
    try:
        result = detect_crisis(req.message, req.context)
        return result
    except Exception as e:
        # On any error, bias toward crisis
        raise HTTPException(status_code=500, detail=str(e))


# ── Briefing Generation ──

class BriefingMessage(BaseModel):
    content: str
    type: str
    createdAt: str


class BriefingMoodLog(BaseModel):
    score: int
    note: str | None = None
    createdAt: str


class BriefingTriggeredRule(BaseModel):
    ruleName: str
    count: int
    lastTriggered: str


class BriefingCrisisEvent(BaseModel):
    detectionLayer: str
    confidence: float
    createdAt: str
    status: str


class BriefingAssignment(BaseModel):
    title: str
    type: str
    status: str
    completedAt: str | None = None


class BriefingGenerateRequest(BaseModel):
    patientId: str
    therapistId: str
    patientName: str
    periodStart: str
    periodEnd: str
    messages: list[BriefingMessage] = []
    moodLogs: list[BriefingMoodLog] = []
    triggeredRules: list[BriefingTriggeredRule] = []
    crisisEvents: list[BriefingCrisisEvent] = []
    assignments: list[BriefingAssignment] = []


class BriefingGenerateResponse(BaseModel):
    content: str


@app.post("/api/v1/briefings/generate", response_model=BriefingGenerateResponse)
def briefing_generate(req: BriefingGenerateRequest):
    try:
        content = generate_briefing(req.model_dump())
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Endpoints to be built ──
# POST /api/v1/rules/match — Rule matching (keyword + semantic)
