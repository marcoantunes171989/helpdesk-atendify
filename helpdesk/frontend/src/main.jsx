import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import App from './App';
import './index.css';

dayjs.locale('pt-br');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      locale={ptBR}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          colorPrimaryHover: '#1d4ed8',
          colorPrimaryActive: '#1e40af',
          borderRadius: 8,
          colorBgContainer: '#0d0d1a',
          colorBgLayout: '#090912',
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
          Button: {
            colorPrimary: '#2563eb',
            algorithm: true,
          },
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
          Tag: {
            borderRadiusSM: 6,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
