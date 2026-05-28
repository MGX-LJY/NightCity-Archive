import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';
import Backlinks from './Backlinks.vue';
import LocalGraph from './LocalGraph.vue';
import GlobalGraph from './GlobalGraph.vue';
import './styles.css';

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-after': () =>
        h('div', { class: 'nca-doc-after' }, [h(LocalGraph), h(Backlinks)]),
    });
  },
  enhanceApp({ app }) {
    app.component('GlobalGraph', GlobalGraph);
  },
};
