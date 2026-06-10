import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { HtmlTagDescriptor, Plugin, ResolvedConfig } from 'vite';

interface Preset {
  id: string;
  label: string;
  token: string;
  destination: string;
}

export function storyScaffoldPlugin(env: Record<string, string>): Plugin {
  const presets: Preset[] = [
    env.VITE_C2C_TOKEN && {
      id: 'c2c',
      label: 'C2C',
      token: env.VITE_C2C_TOKEN,
      destination: env.VITE_C2C_DEST || '',
    },
    env.VITE_C2T_TOKEN && {
      id: 'c2t',
      label: 'C2T',
      token: env.VITE_C2T_TOKEN,
      destination: env.VITE_C2T_DEST || '',
    },
    env.VITE_SAT_TOKEN && {
      id: 'sat',
      label: 'SAT',
      token: env.VITE_SAT_TOKEN,
      destination: env.VITE_SAT_DEST || '',
    },
  ].filter(Boolean) as Preset[];

  const tokenRewrites: [RegExp, string][] = [
    [/import\.meta\.env\.VITE_C2C_TOKEN/g, `(window.__SW_CREDS?.token??${JSON.stringify(env.VITE_C2C_TOKEN || '')})`],
    [/import\.meta\.env\.VITE_C2T_TOKEN/g, `(window.__SW_CREDS?.token??${JSON.stringify(env.VITE_C2T_TOKEN || '')})`],
    [/import\.meta\.env\.VITE_SAT_TOKEN/g, `(window.__SW_CREDS?.token??${JSON.stringify(env.VITE_SAT_TOKEN || '')})`],
    [/import\.meta\.env\.VITE_C2C_DEST/g, `(window.__SW_CREDS?.destination??${JSON.stringify(env.VITE_C2C_DEST || '')})`],
    [/import\.meta\.env\.VITE_C2T_DEST/g, `(window.__SW_CREDS?.destination??${JSON.stringify(env.VITE_C2T_DEST || '')})`],
    [/import\.meta\.env\.VITE_SAT_DEST/g, `(window.__SW_CREDS?.destination??${JSON.stringify(env.VITE_SAT_DEST || '')})`],
  ];

  let config: ResolvedConfig;

  return {
    name: 'story-scaffold',
    configResolved(c) {
      config = c;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const raw = ctx.path || ctx.filename || '';
        const p = raw.startsWith('/') ? raw : '/' + raw;
        const isMain = p === '/' || p === '/index.html' || p.endsWith('/index.html') && !p.includes('/stories/');
        const isStory = p.includes('/stories/') && p.endsWith('.story.html');

        if (!isMain && !isStory) return;

        let processed = html;
        if (isStory) {
          for (const [re, rep] of tokenRewrites) processed = processed.replace(re, rep);
          if (config?.command === 'build') {
            // Dev serves the embed IIFE straight from the package's /dist/embed.
            // Prod-built site carries its own copy under /embed/.
            processed = processed.replace(
              /\/dist\/embed\/signalwire-web-components-embed\.iife\.js/g,
              '/embed/signalwire-web-components-embed.iife.js',
            );
          }
        }

        const tags: HtmlTagDescriptor[] = [
          {
            tag: 'script',
            injectTo: 'head-prepend',
            children: `window.__SW_PRESETS=${JSON.stringify(presets)};`,
          },
        ];

        if (isMain) {
          if (config?.command === 'build') {
            // Inline scaffold.js so the built site doesn't need a /stories/ route.
            const scaffoldSrc = readFileSync(
              resolve(config.root, 'stories/scaffold.js'),
              'utf-8',
            );
            tags.push({ tag: 'script', injectTo: 'head-prepend', children: scaffoldSrc });
          } else {
            tags.push({
              tag: 'script',
              attrs: { src: '/stories/scaffold.js' },
              injectTo: 'head-prepend',
            });
          }
        } else {
          tags.push({
            tag: 'script',
            injectTo: 'head-prepend',
            children: [
              '(function(){',
              '  try{',
              "    var r=localStorage.getItem('sw-story-creds');",
              '    if(r){var p=JSON.parse(r);if(p&&p.token!==undefined){window.__SW_CREDS=p;}}',
              "    var t=localStorage.getItem('sw-story-theme');",
              "    if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);",
              '  }catch(_){}',
              '  if(!window.__SW_CREDS)window.__SW_CREDS=(window.__SW_PRESETS&&window.__SW_PRESETS[0])||',
              "  {id:'custom',label:'Custom',token:'',destination:''};",
              '})();',
            ].join(''),
          });
        }

        return { html: processed, tags };
      },
    },
  };
}