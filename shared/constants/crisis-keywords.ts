/**
 * CRISIS KEYWORD DICTIONARY
 * Layer 1 of crisis detection — exact keyword/phrase matching.
 * Updated quarterly with clinical advisory input.
 *
 * IMPORTANT: This runs BEFORE LLM classification.
 * Biased toward sensitivity (catching more) over specificity (fewer false positives).
 */

export const CRISIS_KEYWORDS_HIGH = [
  // Suicidal ideation
  'kill myself', 'end my life', 'want to die', 'better off dead',
  'no reason to live', 'suicide', 'suicidal',
  'take my own life', 'not worth living', 'end it all',
  // Self-harm
  'cut myself', 'hurt myself', 'self-harm', 'self harm',
  'burn myself', 'overdose',
  // Harm to others
  'kill someone', 'hurt someone', 'going to hurt',
  // Means/plan
  'have a gun', 'have pills', 'have a plan', 'wrote a note',
  'said goodbye', 'giving away', 'final wishes',
];

export const CRISIS_KEYWORDS_MODERATE = [
  // Passive ideation
  'dont want to be here', "don't want to be here",
  'wish I was dead', 'wish i was dead',
  'disappear', 'no one would miss me', 'no one cares',
  'cant go on', "can't go on", 'hopeless',
  'trapped', 'no way out', 'burden',
  // Substance crisis
  'relapsed', 'using again', 'cant stop drinking', "can't stop drinking",
  'blacked out',
];

// These should trigger immediate full-screen crisis UI
export const CRISIS_RESPONSE = {
  message: "What you've shared is really important. I want to make sure you get the right support right now.",
  resources: [
    { name: '988 Suicide & Crisis Lifeline', action: 'Call or text 988', type: 'phone' },
    { name: 'Crisis Text Line', action: 'Text HOME to 741741', type: 'text' },
    { name: 'Emergency Services', action: 'Call 911', type: 'phone' },
  ],
  therapistAlert: "Your therapist is being notified right now.",
};
