import type { TranscriptEntry, TranscriptEntryMeta } from '../components/UI/sw-ui-transcript-view.js';

/**
 * Serializes a transcript entry list to a Markdown string.
 *
 * Format per entry type:
 *   user   → **You:** text
 *   agent  → **Agent:** text
 *   system → *text*
 *
 * meta.code  → fenced code block (with language tag when present)
 * meta.links → markdown link list appended after the message text
 */
export function transcriptToMarkdown(entries: TranscriptEntry[]): string {
  const timestamp = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines: string[] = [`# Transcript`, ``, `*Generated: ${timestamp}*`, ``];

  const completed = entries.filter((e) => e.state === 'complete');

  for (const entry of completed) {
    lines.push('---', '');
    lines.push(...serializeEntry(entry), '');
  }

  if (completed.length > 0) {
    lines.push('---', '');
  }

  return lines.join('\n');
}

function serializeEntry(entry: TranscriptEntry): string[] {
  const lines: string[] = [];

  switch (entry.type) {
    case 'user':
      lines.push(`**You:** ${entry.text}`);
      break;
    case 'agent':
      lines.push(`**Agent:** ${entry.text}`);
      break;
    case 'system':
      lines.push(`*${entry.text}*`);
      break;
  }

  if (entry.meta?.code) {
    const { language = '', content } = entry.meta.code;
    lines.push('', `\`\`\`${language}`, content, '```');
  }

  if (entry.meta?.links?.length) {
    lines.push('');
    for (const link of entry.meta.links) {
      lines.push(`- [${link.label}](${link.url})`);
    }
  }

  if (entry.meta?.displayContent) {
    lines.push(...serializeDisplayContent(entry.meta.displayContent));
  }

  return lines;
}

function serializeDisplayContent(
  dc: NonNullable<TranscriptEntryMeta['displayContent']>
): string[] {
  const lines: string[] = [''];

  switch (dc.format) {
    case 'code':
      lines.push(`\`\`\`${dc.language ?? ''}`, dc.content, '```');
      break;
    case 'markdown':
      lines.push(dc.content);
      break;
    case 'html':
      // Wrap in an HTML comment so the file stays valid markdown while
      // preserving the raw payload for anyone who needs it.
      lines.push('<!-- html content -->', dc.content, '<!-- /html content -->');
      break;
    default:
      lines.push(dc.content);
  }

  return lines;
}
