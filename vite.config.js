import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { company, publish } from './src/config.js';
import { renderAll, jsonLd } from './src/sections/render.js';

// Ersetzt beim Build {{token}} und <!--section:name--> im HTML durch Inhalte aus config.js.
// So steht aller Text statisch im HTML (SEO, schneller erster Paint), ohne Backend.
function siteContent() {
  const sections = renderAll();
  const tokens = {
    ...Object.fromEntries(Object.entries(company).map(([k, v]) => [k, typeof v === 'object' ? '' : String(v)])),
    year: String(new Date().getFullYear()),
    jsonld: jsonLd(),
    robots: publish.indexable ? 'index, follow' : 'noindex, nofollow',
  };
  return {
    name: 'site-content',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace(/<!--section:([a-z-]+)-->/g, (_, key) => {
            if (!(key in sections)) throw new Error(`Unbekannte Sektion: ${key}`);
            return sections[key];
          })
          .replace(/\{\{(\w+)\}\}/g, (_, key) => {
            if (!(key in tokens)) throw new Error(`Unbekannter Platzhalter: ${key}`);
            return tokens[key];
          });
      },
    },
    generateBundle() {
      const url = company.siteUrl.replace(/\/$/, '');
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: publish.indexable ? `User-agent: *\nAllow: /\n\nSitemap: ${url}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n',
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/impressum.html', '/datenschutz.html']
          .map((p) => `  <url><loc>${url}${p}</loc></url>`)
          .join('\n')}\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [siteContent()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        impressum: resolve(import.meta.dirname, 'impressum.html'),
        datenschutz: resolve(import.meta.dirname, 'datenschutz.html'),
      },
    },
  },
});
