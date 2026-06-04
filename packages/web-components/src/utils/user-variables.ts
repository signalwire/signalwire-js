import { getLogger } from '@signalwire/js';

const logger = getLogger();

/** Formats the widget's content drawer can render. */
export const WIDGET_DISPLAY_FORMATS = ['text', 'markdown', 'code', 'html'] as const;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Parse a user-supplied JSON string into a userVariables object. Returns an
 * empty object on null/undefined/empty input, and on parse failure logs a
 * warning and returns an empty object — never throws.
 */
export function parseUserVariablesAttribute(
  raw: string | null | undefined
): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      logger.warn('[CallWidget] user-variables must be a JSON object; ignoring');
      return {};
    }
    return parsed;
  } catch (err) {
    logger.warn('[CallWidget] Failed to parse user-variables JSON; ignoring', err);
    return {};
  }
}

/**
 * Merge widget self-advertisement (display_content capability + opened_at
 * timestamp) into a userVariables object. User-supplied keys win on shallow
 * conflict; capability and metadata sub-objects are deep-merged one level so
 * callers can add their own keys without losing the widget's signal.
 *
 * The shape matches what `Sigmond2Agent._caller_has_display` looks for:
 *   - `capabilities.display_content` (signal #1)
 *   - `metadata.widget.opened_at`    (signal #2)
 */
export function withWidgetCapabilities(
  base: Record<string, unknown>,
  now: () => string = () => new Date().toISOString()
): Record<string, unknown> {
  const baseCaps = isPlainObject(base['capabilities']) ? base['capabilities'] : {};
  const baseMeta = isPlainObject(base['metadata']) ? base['metadata'] : {};
  const baseWidget = isPlainObject(baseMeta['widget']) ? baseMeta['widget'] : {};

  return {
    ...base,
    capabilities: {
      display_content: { formats: [...WIDGET_DISPLAY_FORMATS] },
      ...baseCaps,
    },
    metadata: {
      ...baseMeta,
      widget: {
        opened_at: now(),
        ...baseWidget,
      },
    },
  };
}
