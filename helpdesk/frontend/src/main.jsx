import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import App from './App';
import './index.css';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

dayjs.locale('pt-br');

const DARK_THEME = {
  token: {
    colorPrimary: '#2563eb',
    colorPrimaryHover: '#1d4ed8',
    colorPrimaryActive: '#1e40af',
    borderRadius: 8,
    colorBgContainer: '#0d0d1a',
    colorBgLayout: '#090912',
    colorBgElevated: '#12121f',
    colorBorderSecondary: 'rgba(255,255,255,0.08)',
    colorText: 'rgba(255,255,255,0.82)',
    colorTextSecondary: 'rgba(255,255,255,0.45)',
    colorBorder: 'rgba(255,255,255,0.12)',
    colorFillAlter: '#0d0d1a',
    colorFillContent: '#111120',
    colorFillSecondary: '#111120',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  components: {
    Button: { colorPrimary: '#2563eb', algorithm: true },
    Menu: {
      itemSelectedBg: 'rgba(37,99,235,0.2)',
      itemSelectedColor: '#60a5fa',
      itemHoverBg: 'rgba(255,255,255,0.07)',
      itemHoverColor: 'rgba(255,255,255,0.88)',
      itemColor: 'rgba(255,255,255,0.55)',
    },
    Table: {
      colorBgContainer: '#0d0d1a',
      headerBg: '#111120',
      headerColor: 'rgba(255,255,255,0.38)',
      headerSortActiveBg: '#151525',
      headerSortHoverBg: '#181830',
      bodySortBg: '#0d0d1a',
      rowHoverBg: '#151525',
      rowSelectedBg: 'rgba(37,99,235,0.15)',
      rowSelectedHoverBg: 'rgba(37,99,235,0.22)',
      rowExpandedBg: '#0d0d1a',
      footerBg: '#0d0d1a',
      borderColor: 'rgba(255,255,255,0.07)',
    },
    Card: {
      colorBgContainer: 'rgba(255,255,255,0.04)',
      boxShadowTertiary: '0 4px 28px rgba(0,0,0,0.35)',
    },
    Input: {
      colorBgContainer: '#111120',
      colorBorder: 'rgba(255,255,255,0.12)',
      colorText: 'rgba(255,255,255,0.82)',
      colorTextPlaceholder: 'rgba(255,255,255,0.22)',
    },
    Select: {
      colorBgContainer: '#111120',
      colorBorder: 'rgba(255,255,255,0.12)',
      colorText: 'rgba(255,255,255,0.82)',
      colorTextPlaceholder: 'rgba(255,255,255,0.28)',
      optionSelectedBg: 'rgba(37,99,235,0.2)',
    },
    Modal: {
      colorBgElevated: '#12121f',
      colorText: 'rgba(255,255,255,0.82)',
    },
    Drawer: {
      colorBgElevated: '#0f0f1c',
      colorText: 'rgba(255,255,255,0.82)',
    },
    Tag: { borderRadiusSM: 6 },
    DatePicker: {
      colorBgContainer: '#111120',
      colorBorder: 'rgba(255,255,255,0.12)',
      colorText: 'rgba(255,255,255,0.82)',
      colorTextPlaceholder: 'rgba(255,255,255,0.28)',
    },
  },
};

const LIGHT_THEME = {
  token: {
    colorPrimary: '#2563eb',
    colorPrimaryHover: '#1d4ed8',
    colorPrimaryActive: '#1e40af',
    borderRadius: 8,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f0f2f5',
    colorBgElevated: '#ffffff',
    colorBorderSecondary: 'rgba(0,0,0,0.06)',
    colorText: '#1f2937',
    colorTextSecondary: '#4b5563',
    colorBorder: 'rgba(0,0,0,0.13)',
    colorFillAlter: '#fafafa',
    colorFillContent: '#f5f5f5',
    colorFillSecondary: '#f0f0f0',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  components: {
    Button: { colorPrimary: '#2563eb', algorithm: true },
    Menu: {
      itemSelectedBg: 'rgba(37,99,235,0.10)',
      itemSelectedColor: '#2563eb',
      itemHoverBg: 'rgba(0,0,0,0.04)',
      itemHoverColor: '#111827',
      itemColor: '#4b5563',
    },
    Table: {
      colorBgContainer: '#ffffff',
      headerBg: '#f8fafc',
      headerColor: '#6b7280',
      headerSortActiveBg: '#f1f5f9',
      headerSortHoverBg: '#e2e8f0',
      bodySortBg: '#fafafa',
      rowHoverBg: '#f9fafb',
      rowSelectedBg: 'rgba(37,99,235,0.06)',
      rowSelectedHoverBg: 'rgba(37,99,235,0.10)',
      rowExpandedBg: '#fafafa',
      footerBg: '#fafafa',
      borderColor: 'rgba(0,0,0,0.06)',
    },
    Card: {
      colorBgContainer: '#ffffff',
      boxShadowTertiary: '0 1px 8px rgba(0,0,0,0.08)',
    },
    Input: {
      colorBgContainer: '#ffffff',
      colorBorder: 'rgba(0,0,0,0.15)',
      colorText: '#1f2937',
      colorTextPlaceholder: '#9ca3af',
    },
    Select: {
      colorBgContainer: '#ffffff',
      colorBorder: 'rgba(0,0,0,0.15)',
      colorText: '#1f2937',
      colorTextPlaceholder: '#9ca3af',
      optionSelectedBg: 'rgba(37,99,235,0.08)',
    },
    Modal: {
      colorBgElevated: '#ffffff',
      colorText: '#1f2937',
    },
    Drawer: {
      colorBgElevated: '#ffffff',
      colorText: '#1f2937',
    },
    Tag: { borderRadiusSM: 6 },
    DatePicker: {
      colorBgContainer: '#ffffff',
      colorBorder: 'rgba(0,0,0,0.15)',
      colorText: '#1f2937',
      colorTextPlaceholder: '#9ca3af',
    },
  },
};

function ThemedConfigProvider({ children }) {
  const { resolvedTheme } = useTheme();
  return (
    <ConfigProvider locale={ptBR} theme={resolvedTheme === 'light' ? LIGHT_THEME : DARK_THEME}>
      {children}
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedConfigProvider>
        <App />
      </ThemedConfigProvider>
    </ThemeProvider>
  </React.StrictMode>
);
