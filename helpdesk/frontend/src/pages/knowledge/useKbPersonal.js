import { useCallback, useEffect, useState } from 'react';

// Favoritos e histórico ficam no localStorage, separados por usuário, até o
// backend ter tabelas próprias (Fase 2). Valem só para este navegador.
const HISTORY_LIMIT = 30;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento cheio ou bloqueado */ }
}

export default function useKbPersonal(userId) {
  const favKey = `kb:favorites:${userId || 'anon'}`;
  const histKey = `kb:history:${userId || 'anon'}`;
  const viewKey = `kb:view:${userId || 'anon'}`;

  const [favorites, setFavorites] = useState(() => read(favKey, []));
  const [history, setHistory] = useState(() => read(histKey, []));
  const [view, setViewState] = useState(() => read(viewKey, 'grid'));

  useEffect(() => {
    setFavorites(read(favKey, []));
    setHistory(read(histKey, []));
    setViewState(read(viewKey, 'grid'));
  }, [favKey, histKey, viewKey]);

  const toggleFavorite = useCallback((id) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev];
      write(favKey, next);
      return next;
    });
  }, [favKey]);

  const recordView = useCallback((id) => {
    setHistory(prev => {
      const next = [{ id, at: new Date().toISOString() }, ...prev.filter(h => h.id !== id)].slice(0, HISTORY_LIMIT);
      write(histKey, next);
      return next;
    });
  }, [histKey]);

  const clearHistory = useCallback(() => {
    write(histKey, []);
    setHistory([]);
  }, [histKey]);

  const setView = useCallback((v) => {
    write(viewKey, v);
    setViewState(v);
  }, [viewKey]);

  return { favorites, history, view, toggleFavorite, recordView, clearHistory, setView };
}
