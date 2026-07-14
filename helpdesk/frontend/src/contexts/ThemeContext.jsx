import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(preference) {
  return preference === 'system' ? getSystemTheme() : preference;
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(
    () => localStorage.getItem('atendexa-theme') || 'light'
  );

  const resolvedTheme = resolveTheme(preference);

  const setPreference = (value) => {
    setPreferenceState(value);
    localStorage.setItem('atendexa-theme', value);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolveTheme(preference));
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  return (
    <ThemeContext.Provider value={{ preference, setPreference, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
