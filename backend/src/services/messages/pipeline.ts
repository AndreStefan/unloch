import { prisma } from '../../config/prisma';
import { logAudit } from '../../utils/audit';
import { matchRules } from '../rules/index';
import { createAlert } from '../alerts/index';
import { io } from '../../index';

/**
 * Full message processing pipeline:
 * 1. Save inbound message
 * 2. (Crisis detection already handled by middleware before this runs)
 * 3. Match against rule engine
 * 4. Generate response (rule match or default)
 * 5. Create alert if escalation needed
 * 6. Emit via WebSocket
 * 7. Audit log
 */
export async function processMessage(
  patientId: string,
  content: string,
  socketId?: string,
) {
  // Step 1: Save inbound message
  const inboundMessage = await prisma.message.create({
    data: {
      patientId,
      direction: 'inbound',
      content,
      messageType: 'patient',
    },
  });

  // Step 3: Match rules
  const matches = await matchRules(patientId, content);

  let outboundMessage;

  if (matches.length > 0) {
    // Step 4a: Rule matched — use top match
    const topMatch = matches[0];

    outboundMessage = await prisma.message.create({
      data: {
        patientId,
        direction: 'outbound',
        content: `${topMatch.attribution} ${topMatch.responseContent}`,
        messageType: 'rule_response',
        matchedRuleId: topMatch.ruleId,
        confidenceScore: topMatch.confidence,
      },
    });

    // Step 5: Create alert if escalation level is alert or urgent
    if (topMatch.escalationLevel === 'alert' || topMatch.escalationLevel === 'urgent') {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { therapistId: true },
      });

      if (patient) {
        await createAlert(
          patient.therapistId,
          patientId,
          topMatch.ruleId,
          inboundMessage.id,
          topMatch.escalationLevel,
        );

        // Emit alert to therapist via WebSocket
        io.to(`therapist:${patient.therapistId}`).emit('alert', {
          patientId,
          ruleId: topMatch.ruleId,
          level: topMatch.escalationLevel,
          messageId: inboundMessage.id,
        });
      }
    }
  } else {
    // Step 4b: No match — default response
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { therapist: { select: { name: true } } },
    });

    const therapistName = patient?.therapist?.name || 'your therapist';
    const defaultResponse = `I hear you. Let's make sure ${therapistName} sees this before your next session.`;

    outboundMessage = await prisma.message.create({
      data: {
        patientId,
        direction: 'outbound',
        content: defaultResponse,
        messageType: 'system',
      },
    });
  }

  // Step 6: Emit response via WebSocket
  const socketRoom = `patient:${patientId}`;
  io.to(socketRoom).emit('response', {
    message: sanitizeMessage(outboundMessage),
  });

  // Step 7: Audit log
  await logAudit(patientId, 'patient', 'message.processed', 'message', inboundMessage.id, {
    matchedRules: matches.length,
    topRuleId: matches[0]?.ruleId || null,
    responseMessageId: outboundMessage.id,
  });

  return {
    message: sanitizeMessage(inboundMessage),
    response: sanitizeMessage(outboundMessage),
  };
}

function sanitizeMessage(msg: {
  id: string;
  patientId: string;
  direction: string;
  content: string;
  messageType: string;
  matchedRuleId: string | null;
  confidenceScore: number | null;
  createdAt: Date;
}) {
  return {
    id: msg.id,
    direction: msg.direction,
    content: msg.content,
    messageType: msg.messageType,
    matchedRuleId: msg.matchedRuleId,
    confidenceScore: msg.confidenceScore,
    createdAt: msg.createdAt,
  };
}
