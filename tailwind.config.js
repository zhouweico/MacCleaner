/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        macos: {
          // macOS System Settings 风格深色主题
          sidebar: '#1d1d1f',         // 侧边栏背景（最深）
          'sidebar-hover': '#2a2a2e', // 侧边栏 hover
          'sidebar-active': '#007AFF', // 侧边栏选中（实心蓝）
          content: '#232326',         // 中间栏背景（中间态）
          'content-light': '#28282b', // 右边栏背景（最浅）
          surface: '#2d2d30',         // 卡片/分组背景（最亮）
          'surface-hover': '#363638', // 卡片内 hover
          separator: 'rgba(255,255,255,0.08)',
          'text-primary': '#f5f5f7',
          'text-secondary': 'rgba(235,235,245,0.6)',
          'text-tertiary': 'rgba(235,235,245,0.3)',
          accent: '#007AFF',           // macOS 系统蓝
          'accent-hover': '#409cff',
          selection: 'rgba(0,122,255,0.25)',
          green: '#30D158',
          red: '#FF453A',
          orange: '#FF9F0A',
          // 图标背景色（SF Symbols 风格）
          'icon-blue': '#0A84FF',
          'icon-green': '#30D158',
          'icon-orange': '#FF9F0A',
          'icon-red': '#FF453A',
          'icon-purple': '#BF5AF2',
          'icon-teal': '#64D2FF',
          'icon-pink': '#FF375F',
          'icon-indigo': '#5E5CE6',
          'icon-yellow': '#FFD60A',
        },
      },
    },
  },
  plugins: [],
};
