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
          colorPrimary: '#16a34a',
          colorPrimaryHover: '#15803d',
          colorPrimaryActive: '#166534',
          borderRadius: 8,
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f4f9f6',
          colorBorderSecondary: '#e5e7eb',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        components: {
          Button: {
            colorPrimary: '#16a34a',
            algorithm: true,
          },
          Menu: {
            itemSelectedBg: '#dcfce7',
            itemSelectedColor: '#16a34a',
            itemHoverBg: '#f0fdf4',
            itemHoverColor: '#16a34a',
          },
          Table: {
            headerBg: '#f9fafb',
            headerColor: '#6b7280',
            rowHoverBg: '#f0fdf4',
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
