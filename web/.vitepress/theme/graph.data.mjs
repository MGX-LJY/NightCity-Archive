import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanContent } from '../wikilinks.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_GLOB = path
  .resolve(__dirname, '..', '..', '..', 'content', '**', '*.md')
  .replace(/\\/g, '/');

export default {
  watch: [CONTENT_GLOB],
  async load() {
    const { graph } = scanContent();
    return graph;
  },
};
