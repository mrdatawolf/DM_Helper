// Universe-owned wizard content is loaded before dependent ES modules execute.
const response = await fetch('/api/universe/content/wizard');
const content = response.ok ? await response.json() : {};

const STAT_KEYS = content.STAT_KEYS || [];
const STAT_FULL = content.STAT_FULL || {};
const CLASSES_5E = content.CLASSES_5E || [];
const IMPRINT_LORE = content.IMPRINT_LORE || {};
const WIZARD_STEP_INFO = content.WIZARD_STEP_INFO || {};
const FIELD_INFO = content.FIELD_INFO || {};
const FLAW_TRAIT_PAIRS = content.FLAW_TRAIT_PAIRS || { pattern: [], logrus: [], noImprint: {} };

export { STAT_KEYS, STAT_FULL, CLASSES_5E, IMPRINT_LORE, WIZARD_STEP_INFO, FIELD_INFO, FLAW_TRAIT_PAIRS };
