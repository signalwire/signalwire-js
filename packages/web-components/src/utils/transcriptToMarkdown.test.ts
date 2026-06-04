import { describe, it, expect } from 'vitest';
import { transcriptToMarkdown } from './transcriptToMarkdown.js';
import type { TranscriptEntry } from '../components/UI/sw-ui-transcript-view.js';

const complete = (e: Partial<TranscriptEntry> & Pick<TranscriptEntry, 'id' | 'type' | 'text'>): TranscriptEntry => ({
  state: 'complete',
  ...e,
});

describe('transcriptToMarkdown', () => {
  it('emits a header and timestamp', () => {
    const md = transcriptToMarkdown([]);
    expect(md.startsWith('# Transcript\n')).toBe(true);
    expect(md).toMatch(/\*Generated: .+\*/);
  });

  it('formats user / agent / system entries with the right prefixes', () => {
    const md = transcriptToMarkdown([
      complete({ id: '1', type: 'user', text: 'hello' }),
      complete({ id: '2', type: 'agent', text: 'hi back' }),
      complete({ id: '3', type: 'system', text: 'connected' }),
    ]);
    expect(md).toContain('**You:** hello');
    expect(md).toContain('**Agent:** hi back');
    expect(md).toContain('*connected*');
  });

  it('skips partial entries', () => {
    const md = transcriptToMarkdown([
      complete({ id: '1', type: 'user', text: 'shipped' }),
      { id: '2', type: 'agent', state: 'partial', text: 'in-flight' },
    ]);
    expect(md).toContain('shipped');
    expect(md).not.toContain('in-flight');
  });

  it('emits separators between completed entries and a trailing one', () => {
    const md = transcriptToMarkdown([
      complete({ id: '1', type: 'user', text: 'a' }),
      complete({ id: '2', type: 'agent', text: 'b' }),
    ]);
    // 2 entries → 3 separators (before each + after the last)
    expect(md.match(/^---$/gm)?.length).toBe(3);
  });

  it('does not append a trailing separator when there are no completed entries', () => {
    const md = transcriptToMarkdown([
      { id: '1', type: 'user', state: 'partial', text: 'x' },
    ]);
    expect(md).not.toMatch(/^---$/m);
  });

  it('renders meta.code as a fenced block with the language tag', () => {
    const md = transcriptToMarkdown([
      complete({
        id: '1',
        type: 'agent',
        text: 'see snippet:',
        meta: { code: { language: 'ts', content: 'const x = 1;' } },
      }),
    ]);
    expect(md).toContain('```ts');
    expect(md).toContain('const x = 1;');
    expect(md).toMatch(/```ts\nconst x = 1;\n```/);
  });

  it('renders meta.code without a language when not provided', () => {
    const md = transcriptToMarkdown([
      complete({
        id: '1',
        type: 'agent',
        text: 't',
        meta: { code: { content: 'plain' } },
      }),
    ]);
    expect(md).toMatch(/```\nplain\n```/);
  });

  it('renders meta.links as a markdown list', () => {
    const md = transcriptToMarkdown([
      complete({
        id: '1',
        type: 'agent',
        text: 'docs:',
        meta: {
          links: [
            { label: 'Site', url: 'https://example.com' },
            { label: 'Repo', url: 'https://github.com/foo/bar' },
          ],
        },
      }),
    ]);
    expect(md).toContain('- [Site](https://example.com)');
    expect(md).toContain('- [Repo](https://github.com/foo/bar)');
  });

  it('serializes displayContent for each format', () => {
    const code = transcriptToMarkdown([
      complete({
        id: '1', type: 'agent', text: 'x',
        meta: { displayContent: { format: 'code', language: 'sql', content: 'SELECT 1' } },
      }),
    ]);
    expect(code).toMatch(/```sql\nSELECT 1\n```/);

    const md = transcriptToMarkdown([
      complete({
        id: '1', type: 'agent', text: 'x',
        meta: { displayContent: { format: 'markdown', content: '# Hi' } },
      }),
    ]);
    expect(md).toContain('# Hi');

    const htmlMd = transcriptToMarkdown([
      complete({
        id: '1', type: 'agent', text: 'x',
        meta: { displayContent: { format: 'html', content: '<b>hi</b>' } },
      }),
    ]);
    expect(htmlMd).toContain('<!-- html content -->');
    expect(htmlMd).toContain('<b>hi</b>');
    expect(htmlMd).toContain('<!-- /html content -->');

    const text = transcriptToMarkdown([
      complete({
        id: '1', type: 'agent', text: 'x',
        meta: { displayContent: { format: 'text', content: 'plain' } },
      }),
    ]);
    expect(text).toContain('plain');
  });
});
