export const CATEGORY_COLOR = {
  '01_人物': '#22d3ee',
  '02_公司': '#f472b6',
  '03_组织': '#facc15',
  '04_科技': '#a78bfa',
  '05_历史事件': '#4ade80',
  '06_地点': '#fb923c',
  '07_思想主题': '#94a3b8',
  '00_原始资料': '#64748b',
};

export const CATEGORY_LABEL = {
  '01_人物': '人物',
  '02_公司': '公司',
  '03_组织': '组织',
  '04_科技': '科技',
  '05_历史事件': '事件',
  '06_地点': '地点',
  '07_思想主题': '思想',
  '00_原始资料': '原始',
};

export function colorOf(category) {
  return CATEGORY_COLOR[category] || '#9ca3af';
}

export function labelOf(category) {
  return CATEGORY_LABEL[category] || category || '其他';
}
