import { defineConfig } from 'astro/config';

// Le domaine définitif est TO_CONFIRM : `site` sera renseigné avant publication
// (il conditionne les URLs canoniques absolues et le sitemap).
export default defineConfig({
  devToolbar: { enabled: false },
  server: { port: 4321 },
});
