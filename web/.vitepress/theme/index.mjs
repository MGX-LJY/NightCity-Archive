import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';
import Backlinks from './Backlinks.vue';
import LocalGraph from './LocalGraph.vue';
import GlobalGraph from './GlobalGraph.vue';
import RawToggle from './RawToggle.vue';
import './styles.css';

// 给侧边栏「原始资料」这一整组打标记，便于 CSS 在隐藏开关开启时整体折叠
function tagRawSidebarGroup() {
  if (typeof document === 'undefined') return;
  const groups = document.querySelectorAll('.VPSidebarItem.level-0');
  groups.forEach((g) => {
    const label = g.querySelector(':scope > .item .text');
    if (label && label.textContent.trim() === '原始资料') {
      g.classList.add('nca-raw-group');
    }
  });
}

// 给人物头像（标题正下方那张图）注入"显示/隐藏"切换按钮：默认隐藏，点击才显示
function setupPortraitToggles() {
  if (typeof document === 'undefined') return;
  const imgs = document.querySelectorAll('.vp-doc h1 + p img');
  imgs.forEach((img) => {
    if (img.dataset.ncaPortrait) return;
    img.dataset.ncaPortrait = '1';

    const name = (img.getAttribute('alt') || '').trim();
    const labelShow = name ? `🖼 显示${name}头像` : '🖼 显示头像';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nca-portrait-toggle';
    btn.textContent = labelShow;

    btn.addEventListener('click', () => {
      img.classList.add('nca-portrait-show');
      btn.style.display = 'none';
    });
    // 点击图片即可收起，恢复按钮
    img.addEventListener('click', () => {
      img.classList.remove('nca-portrait-show');
      btn.style.display = '';
    });

    img.parentNode.insertBefore(btn, img);
  });
}

function schedulePortraitToggles() {
  if (typeof window === 'undefined') return;
  let tries = 0;
  const tick = () => {
    setupPortraitToggles();
    tagRawSidebarGroup();
    if (++tries < 8) setTimeout(tick, 100);
  };
  tick();
}

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(RawToggle),
      'doc-after': () =>
        h('div', { class: 'nca-doc-after' }, [h(LocalGraph), h(Backlinks)]),
    });
  },
  enhanceApp({ app, router }) {
    app.component('GlobalGraph', GlobalGraph);
    if (typeof window !== 'undefined') {
      const prev = router.onAfterRouteChange;
      router.onAfterRouteChange = (to) => {
        if (prev) prev(to);
        schedulePortraitToggles();
      };
      schedulePortraitToggles();
    }
  },
};
