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
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f0f7ff',
          colorBorderSecondary: '#e5e7eb',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        components: {
          Button: {
            colorPrimary: '#2563eb',
            algorithm: true,
          },
          Menu: {
            itemSelectedBg: '#dbeafe',
            itemSelectedColor: '#2563eb',
            itemHoverBg: '#eff6ff',
            itemHoverColor: '#2563eb',
          },
          Table: {
            headerBg: '#f9fafb',
            headerColor: '#6b7280',
            rowHoverBg: '#eff6ff',
          },
          Card: {
            boxShadowTertiary: '0 1px 3px rgba(0,0,0,0.06)',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
