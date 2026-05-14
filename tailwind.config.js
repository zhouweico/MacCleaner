/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        macos: {
          // macOS System Settings 风格深色主题
          bg: '#1e1e1e',              // 整体背景（窗口底色）
          sidebar: '#2d2d2d',         // 侧边栏背景（圆角框）
          'sidebar-hover': '#3a3a3a', // 侧边栏 hover
          'sidebar-active': '#007AFF', // 侧边栏选中（实心蓝）
          content: '#252525',         // 中间栏背景
          'content-light': '#2a2a2a', // 右边栏背景
          surface: '#323232',         // 卡片/分组背景
          'surface-hover': '#3d3d3d', // 卡片内 hover
          'header-bg': '#353535',     // 中间栏顶部选项卡背景
          separator: 'rgba(255,255,255,0.08)',
          'text-primary': '#f5f5f7',
          'text-secondary': 'rgba(235,235,245,0.6)',
          'text-tertiary': 'rgba(235,235,245,0.3)',
          accent: '#007AFF',           // macOS 系统蓝
          'accent-hover': '#409cff',
          selection: 'rgba(0,122,255,0.25)',
          green: '#30D158',
          'green-hover': '#34d45c',
          red: '#FF453A',
          'red-hover': '#ff5e54',
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
