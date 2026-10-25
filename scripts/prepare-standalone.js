import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const publicDir = path.resolve('.output/public');
const assetsDir = path.join(publicDir, 'assets');
const targetHtml = path.join(publicDir, 'index.html');

if (!fs.existsSync(assetsDir)) {
  console.error('Directory .output/public/assets does not exist. Please run vite build first.');
  process.exit(1);
}

/**
 * Android (WebView Capacitor) : le bundle client de TanStack Start est un
 * client SSR. Son point d'entree fait `hydrateRoot(document, ...)` et attend le
 * payload de demarrage `window.$_TSR` (manifest + etat dehydrate du routeur)
 * que le serveur injecte dans le HTML. La WebView Capacitor ne sert que des
 * fichiers statiques : un shell HTML ecrit a la main ne contient ni markup
 * rendu ni payload $_TSR, le bootstrap du routeur echoue et l'ecran reste
 * blanc.
 *
 * On rend donc le shell avec le serveur construit (build SSR Vite) et on
 * embarque ce HTML : le client retrouve le markup ET le payload $_TSR, et
 * l'hydratation reussit. Si le rendu est impossible, le build echoue
 * explicitement plutot que de produire un APK a l'ecran blanc.
 */
const serverBuildCandidates = [
  'node_modules/.nitro/vite/services/ssr/index.js',
  'node_modules/.nitro/vite/services/ssr/server.js',
  'dist/server/index.js',
  'dist/server/server.js',
];

async function renderShell() {
  for (const candidate of serverBuildCandidates) {
    const entry = path.resolve(candidate);
    if (!fs.existsSync(entry)) continue;
    const mod = await import(pathToFileURL(entry).href);
    const handler = mod.default ?? mod.server ?? mod;
    if (typeof handler?.fetch !== 'function') continue;
    const response = await handler.fetch(new Request('http://localhost/'));
    const html = await response.text();
    if (!response.ok) {
      throw new Error(`SSR render of / failed with status ${response.status}`);
    }
    if (!html.includes('$_TSR')) {
      throw new Error(
        'SSR render of / does not contain the $_TSR hydration payload: ' +
          'the client bundle would not be able to hydrate and the app would show a white screen.',
      );
    }
    return { html, entry: candidate };
  }
  throw new Error(
    'SSR server build not found. Looked for:\n  ' + serverBuildCandidates.join('\n  '),
  );
}

const mobileStyle = `<style>
    /* Prevent pull-to-refresh and bounce on mobile */
    html, body {
      overscroll-behavior-y: none;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      -webkit-user-select: none;
    }
  </style>
`;

try {
  const { html, entry } = await renderShell();
  const withStyle = html.includes('overscroll-behavior-y')
    ? html
    : html.replace('</head>', `${mobileStyle}</head>`);
  fs.writeFileSync(targetHtml, withStyle, 'utf-8');
  console.log(
    `[Islam Noor] Generated index.html from the SSR render (${entry}) -> ${targetHtml}`,
  );
} catch (err) {
  console.error('[Islam Noor] Could not generate the Android shell: ', err);
  console.error(
    '[Islam Noor] The APK would start on a white screen (missing $_TSR hydration payload). Aborting.',
  );
  process.exit(1);
}

try {
  console.log('[Islam Noor] Running Capacitor sync for Android...');
  execSync('npx cap sync android', { stdio: 'inherit' });
  console.log('[Islam Noor] Android sync completed successfully.');
} catch (err) {
  console.error('[Islam Noor] Capacitor sync error:', err);
}
