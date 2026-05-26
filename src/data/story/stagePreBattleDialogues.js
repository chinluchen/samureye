import { STAGE_IDS } from '../stageConfigs.js';

const STAGE_PRE_BATTLE_DIALOGUES = Object.freeze({
  [STAGE_IDS.STAGE_02]: Object.freeze({
    title: '序章-視界的崩壞：中',
    lines: Object.freeze([
      Object.freeze({
        speaker: 'SAMUREYE',
        text: '前方有視變體反應，這次是真正的實戰。'
      }),
      Object.freeze({
        speaker: '系統提示',
        text: '穩住節奏，先觀察攻擊軌跡，再找機會反擊。'
      })
    ])
  })
});

function normalizeStageId(stageId = '') {
  return String(stageId ?? '').trim();
}

function normalizeLine(rawLine = {}) {
  return {
    speaker: String(rawLine?.speaker ?? '').trim(),
    text: String(rawLine?.text ?? '').trim()
  };
}

export function getStagePreBattleDialogue(stageId = '') {
  const normalizedId = normalizeStageId(stageId);
  if (!normalizedId) return null;

  const entry = STAGE_PRE_BATTLE_DIALOGUES[normalizedId];
  if (!entry || typeof entry !== 'object') return null;

  const lines = Array.isArray(entry.lines)
    ? entry.lines.map(normalizeLine).filter(line => line.text)
    : [];

  if (lines.length <= 0) return null;

  return {
    stageId: normalizedId,
    title: String(entry.title ?? '').trim(),
    lines
  };
}

