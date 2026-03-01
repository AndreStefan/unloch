import { Request, Response, NextFunction } from 'express';
import {
  CRISIS_KEYWORDS_HIGH,
  CRISIS_KEYWORDS_MODERATE,
  CRISIS_RESPONSE,
} from '../constants/crisis-keywords';
import { logAudit } from '../utils/audit';
import { handleCrisisEvent, callAiCrisisDetection } from '../services/crisis/index';

/**
 * Crisis detection middleware — runs on EVERY patient message POST
 * before any other processing (rule engine, etc.).
 *
 * Layer 1: Keyword scan (instant, no network call)
 * Layer 2: AI classification via ai-service (only for moderate matches)
 *
 * CANNOT be bypassed or disabled.
 */
export async function crisisDetection(req: Request, res: Response, next: NextFunction) {
  try {
    const { content, patientId } = req.body;
    if (!content || !patientId) {
      return next();
    }

    const messageLower = content.toLowerCase();

    // ── Layer 1: HIGH keyword scan ──
    const highMatch = CRISIS_KEYWORDS_HIGH.find((kw) => messageLower.includes(kw));
    if (highMatch) {
      await logAudit(
        patientId,
        'patient',
        'crisis.detected.keyword_high',
        'message',
        'pending',
        { keyword: highMatch, confidence: 1.0, layer: 'keyword' },
        req.ip,
      );

      const crisisEvent = await handleCrisisEvent(patientId, null, 'keyword', 1.0, {
        keyword: highMatch,
        messageContent: content,
      });

      res.status(200).json({
        crisis: true,
        crisisEventId: crisisEvent.id,
        response: CRISIS_RESPONSE,
      });
      return;
    }

    // ── Layer 1: MODERATE keyword scan → Layer 2 AI classification ──
    const moderateMatch = CRISIS_KEYWORDS_MODERATE.find((kw) => messageLower.includes(kw));
    if (moderateMatch) {
      await logAudit(
        patientId,
        'patient',
        'crisis.detected.keyword_moderate',
        'message',
        'pending',
        { keyword: moderateMatch, layer: 'keyword_moderate' },
        req.ip,
      );

      // Call AI service for Layer 2 classification
      const context = req.body.context || [];
      const aiResult = await callAiCrisisDetection(content, context);

      await logAudit(
        'system',
        'system',
        'crisis.ai_classification',
        'message',
        'pending',
        {
          isCrisis: aiResult.is_crisis,
          confidence: aiResult.confidence,
          reasoning: aiResult.reasoning,
          detectedSignals: aiResult.detected_signals,
          layer: 'llm',
        },
        req.ip,
      );

      if (aiResult.is_crisis) {
        const crisisEvent = await handleCrisisEvent(patientId, null, 'llm', aiResult.confidence, {
          keyword: moderateMatch,
          aiReasoning: aiResult.reasoning,
          aiSignals: aiResult.detected_signals,
          messageContent: content,
        });

        res.status(200).json({
          crisis: true,
          crisisEventId: crisisEvent.id,
          response: CRISIS_RESPONSE,
        });
        return;
      }
    }

    // No crisis detected — pass through to next handler (rule engine)
    next();
  } catch (err) {
    // Crisis detection errors should NOT block message processing,
    // but we log them as critical. Bias toward safety: if AI service
    // is down during a moderate match, escalate anyway.
    console.error('Crisis detection error:', err);
    await logAudit(
      req.body?.patientId || 'unknown',
      'system',
      'crisis.detection_error',
      'message',
      'pending',
      { error: String(err) },
      req.ip,
    );
    // On error with a moderate keyword present, escalate out of caution
    const messageLower = (req.body?.content || '').toLowerCase();
    const moderateMatch = CRISIS_KEYWORDS_MODERATE.find((kw) => messageLower.includes(kw));
    if (moderateMatch && req.body?.patientId) {
      try {
        const crisisEvent = await handleCrisisEvent(
          req.body.patientId,
          null,
          'keyword',
          0.7,
          { keyword: moderateMatch, escalatedDueToError: true },
        );
        res.status(200).json({
          crisis: true,
          crisisEventId: crisisEvent.id,
          response: CRISIS_RESPONSE,
        });
        return;
      } catch {
        // Even the fallback failed — still return crisis response
        res.status(200).json({ crisis: true, response: CRISIS_RESPONSE });
        return;
      }
    }
    next();
  }
}
