/// <reference types="vite/client" />

// ── Story Discovery ───────────────────────────────────────────────────────────
// Vite resolves this glob at build time; we only use the keys, hence `?url`
// (so HTML files aren't treated as importable modules during build).

const storyModules = import.meta.glob('../../stories/**/*.story.html', {
  query: '?url',
  import: 'default',
});

// '../../stories/ui/ctrl-button.story.html' → 'ui/ctrl-button'
function keyToStoryPath(key: string): string {
  return key.replace('../../stories/', '').replace('.story.html', '');
}

// Keep hyphens — they're part of web-component names (e.g. 'sw-call-widget').
// Underscores, if ever used as a separator, become spaces.
function toTitle(segment: string): string {
  return segment.replace(/_/g, ' ');
}

// ── Navigation Tree ───────────────────────────────────────────────────────────

interface NavLeaf {
  kind: 'leaf';
  title: string;
  storyPath: string;
}

interface NavGroup {
  kind: 'group';
  title: string;
  children: Record<string, NavLeaf | NavGroup>;
}

type NavNode = NavLeaf | NavGroup;

// Top-level sidebar order. Folders listed here render in this sequence;
// anything not listed slots in between the explicit head and tail groups
// (alphabetically). Keep `demos` first and `advanced` last.
const TOP_LEVEL_ORDER_HEAD = ['demos', 'ui', 'layout'];
const TOP_LEVEL_ORDER_TAIL = ['advanced'];

function sortTopLevel(keys: string[]): string[] {
  const head = TOP_LEVEL_ORDER_HEAD.filter((k) => keys.includes(k));
  const tail = TOP_LEVEL_ORDER_TAIL.filter((k) => keys.includes(k));
  const middle = keys
    .filter((k) => !head.includes(k) && !tail.includes(k))
    .sort();
  return [...head, ...middle, ...tail];
}

function buildTree(modules: Record<string, unknown>): Record<string, NavNode> {
  const tree: Record<string, NavNode> = {};

  for (const key of Object.keys(modules)) {
    const storyPath = keyToStoryPath(key);
    const parts = storyPath.split('/');
    let current = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!current[part]) {
        current[part] = { kind: 'group', title: toTitle(part), children: {} };
      }
      const node = current[part]!;
      current = (node as NavGroup).children as Record<string, NavNode>;
    }

    const leaf = parts[parts.length - 1]!;
    current[leaf] = { kind: 'leaf', title: toTitle(leaf), storyPath };
  }

  return tree;
}

// Per-folder leaf ordering hints. Anything not pinned sorts alphabetically.
const FOLDER_ORDER_HEAD: Record<string, string[]> = {
  demos: ['welcome'],
};

function sortFolder(folder: string | null, keys: string[]): string[] {
  const head = (folder && FOLDER_ORDER_HEAD[folder]) || [];
  const pinned = head.filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !pinned.includes(k)).sort();
  return [...pinned, ...rest];
}

function renderTree(
  tree: Record<string, NavNode>,
  container: HTMLElement,
  depth: number,
  registry: Map<string, HTMLAnchorElement>,
  folder: string | null = null,
): void {
  const keys =
    depth === 0
      ? sortTopLevel(Object.keys(tree))
      : sortFolder(folder, Object.keys(tree));
  for (const key of keys) {
    const node = tree[key]!;
    if (node.kind === 'leaf') {
      const a = document.createElement('a');
      a.href = `#/story/${node.storyPath}`;
      a.textContent = node.title;
      a.dataset['storyPath'] = node.storyPath;
      a.style.cssText = `
        display:block;padding:5px 10px 5px ${10 + depth * 14}px;
        font-size:13px;color:#94a3b8;text-decoration:none;
        border-radius:4px;margin:1px 6px;
        transition:background 0.1s,color 0.1s;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      `;
      a.addEventListener('pointerover', () => {
        if (!a.classList.contains('active')) {
          a.style.background = 'rgba(255,255,255,0.05)';
          a.style.color = '#e2e8f0';
        }
      });
      a.addEventListener('pointerout', () => {
        if (!a.classList.contains('active')) {
          a.style.background = '';
          a.style.color = '#94a3b8';
        }
      });
      registry.set(node.storyPath, a);
      container.appendChild(a);
    } else {
      const group = document.createElement('div');
      const label = document.createElement('div');
      label.textContent = node.title;
      label.style.cssText = `
        padding:${depth === 0 ? '14px' : '8px'} 10px 3px ${10 + depth * 14}px;
        font-size:10px;font-weight:700;text-transform:uppercase;
        letter-spacing:0.09em;color:#334155;
      `;
      group.appendChild(label);
      renderTree(
        node.children as Record<string, NavNode>,
        group,
        depth + 1,
        registry,
        depth === 0 ? key : folder,
      );
      container.appendChild(group);
    }
  }
}

// ── Active Link ───────────────────────────────────────────────────────────────

const linkRegistry = new Map<string, HTMLAnchorElement>();
let activeLink: HTMLAnchorElement | null = null;

function setActive(storyPath: string | null) {
  if (activeLink) {
    activeLink.classList.remove('active');
    activeLink.style.background = '';
    activeLink.style.color = '#94a3b8';
    activeLink = null;
  }
  if (!storyPath) return;
  const link = linkRegistry.get(storyPath) ?? null;
  if (link) {
    activeLink = link;
    link.classList.add('active');
    link.style.background = 'rgba(4,76,246,0.2)';
    link.style.color = '#f1f5f9';
    link.scrollIntoView({ block: 'nearest' });
  }
}

// ── Outlet rendering ──────────────────────────────────────────────────────────
// Hash-routed: `#/story/ui/foo` → iframe, anything else → home placeholder.
// No history routing, so refresh and direct-link both work on any static host.

const outlet = document.getElementById('outlet')!;
let currentStoryPath: string | null = null;
let currentIframe: HTMLIFrameElement | null = null;

function renderHome(): void {
  outlet.innerHTML = `
    <div style="
      display:flex;align-items:center;justify-content:center;
      height:100vh;flex-direction:column;gap:10px;
    ">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
      <div style="font-size:16px;font-weight:600;color:#334155;">SignalWire Web Components</div>
      <div style="font-size:13px;color:#94a3b8;">Select a story from the sidebar to get started</div>
    </div>
  `;
  currentIframe = null;
}

function renderStory(storyPath: string): void {
  // Story HTML files are emitted at /stories/<path>.story.html in both
  // dev (Vite serves source HTML) and prod build (Rollup keeps the path).
  const iframe = document.createElement('iframe');
  iframe.src = `stories/${storyPath}.story.html`;
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
  iframe.title = `Story: ${storyPath}`;
  iframe.addEventListener('load', () => {
    const creds = (window as unknown as Record<string, unknown>)['__SW_CREDS'] as
      | { token?: string; destination?: string }
      | undefined;
    if (creds) applyCredsToIframe(iframe, creds);
  });
  outlet.innerHTML = '';
  outlet.style.height = '100%';
  outlet.appendChild(iframe);
  currentIframe = iframe;
}

function applyCredsToIframe(
  iframe: HTMLIFrameElement,
  creds: { token?: string; destination?: string },
): void {
  const doc = iframe.contentDocument;
  if (!doc) return;
  const { token = '', destination = '' } = creds;
  doc.querySelectorAll('sw-call-widget, sw-click-to-call').forEach((el) => {
    (el as unknown as Record<string, string>)['token'] = token;
    (el as unknown as Record<string, string>)['destination'] = destination;
  });
}

window.addEventListener('sw-creds-change', (e: Event) => {
  if (!currentIframe) return;
  const creds = (e as CustomEvent<{ token: string; destination: string }>).detail;
  applyCredsToIframe(currentIframe, creds);
});

// ── Hash routing ──────────────────────────────────────────────────────────────

function parseHash(): string | null {
  // Accept '#/story/foo', '#story/foo', or any leading slashes.
  const raw = window.location.hash.replace(/^#\/?/, '');
  if (!raw.startsWith('story/')) return null;
  const storyPath = raw.slice('story/'.length);
  return storyPath.length > 0 ? storyPath : null;
}

function applyRoute(): void {
  const storyPath = parseHash();
  if (storyPath === currentStoryPath) return;
  currentStoryPath = storyPath;
  if (storyPath) {
    setActive(storyPath);
    renderStory(storyPath);
  } else {
    setActive(null);
    renderHome();
  }
}

window.addEventListener('hashchange', applyRoute);

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const nav = document.getElementById('nav')!;
const tree = buildTree(storyModules);
renderTree(tree, nav, 0, linkRegistry);
applyRoute();
