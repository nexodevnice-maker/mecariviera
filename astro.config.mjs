import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Adresse de production (Cloudflare Pages) : base des URLs absolues (canonique, Open Graph) et du sitemap.
// Nouveau domaine : changer `site` ici et la ligne Sitemap de public/robots.txt.
export default defineConfig({
  site: 'https://nexodev.pages.dev',
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  server: { port: 4321 },
});
