import { useCallback, useEffect, useRef, useState } from 'react';
import { knowledgeService } from '../../services/api';

// Preferência de grade/lista continua no navegador.
// Favoritos e histórico: servidor (Etapa E), com import único do localStorage.
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
  const migratedKey = `kb:personal-migrated:${userId || 'anon'}`;

  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [view, setViewState] = useState(() => read(viewKey, 'grid'));
  const [ready, setReady] = useState(false);
  const booting = useRef(false);

  useEffect(() => {
    setViewState(read(viewKey, 'grid'));
  }, [viewKey]);

  useEffect(() => {
    if (!userId) {
      setFavorites([]);
      setHistory([]);
      setReady(false);
      return undefined;
    }
    let alive = true;
    booting.current = true;

    (async () => {
      try {
        const migrated = read(migratedKey, false);
        const localFav = read(favKey, []);
        const localHist = read(histKey, []);

        if (!migrated && (localFav.length > 0 || localHist.length > 0)) {
          const imported = await knowledgeService.importLocalPersonal({
            favorites: localFav,
            history: localHist,
          });
          if (!alive) return;
          setFavorites(imported.favorites || []);
          setHistory(imported.history || []);
          write(migratedKey, true);
          // Mantém uma cópia local só como cache; a fonte da verdade é o servidor.
          write(favKey, imported.favorites || []);
          write(histKey, imported.history || []);
        } else {
          const [favRes, histRes] = await Promise.all([
            knowledgeService.listFavorites(),
            knowledgeService.listHistory(),
          ]);
          if (!alive) return;
          setFavorites(favRes.favorites || []);
          setHistory(histRes.history || []);
          write(favKey, favRes.favorites || []);
          write(histKey, histRes.history || []);
          if (!migrated) write(migratedKey, true);
        }
      } catch {
        // Fallback offline: usa o que estiver no navegador.
        if (!alive) return;
        setFavorites(read(favKey, []));
        setHistory(read(histKey, []));
      } finally {
        if (alive) {
          setReady(true);
          booting.current = false;
        }
      }
    })();

    return () => { alive = false; };
  }, [userId, favKey, histKey, migratedKey]);

  const toggleFavorite = useCallback(async (id) => {
    const wasOn = favorites.includes(id);
    const optimistic = wasOn ? favorites.filter(x => x !== id) : [id, ...favorites];
    setFavorites(optimistic);
    write(favKey, optimistic);
    try {
      const res = wasOn
        ? await knowledgeService.removeFavorite(id)
        : await knowledgeService.addFavorite(id);
      const next = res.favorites || optimistic;
      setFavorites(next);
      write(favKey, next);
    } catch {
      setFavorites(favorites);
      write(favKey, favorites);
    }
  }, [favorites, favKey]);

  const recordView = useCallback((id) => {
    // O GET do artigo já grava histórico no servidor; aqui só atualiza o cache local.
    setHistory(prev => {
      const next = [{ id, at: new Date().toISOString() }, ...prev.filter(h => h.id !== id)].slice(0, HISTORY_LIMIT);
      write(histKey, next);
      return next;
    });
  }, [histKey]);

  const clearHistory = useCallback(async () => {
    const prev = history;
    setHistory([]);
    write(histKey, []);
    try {
      await knowledgeService.clearHistory();
    } catch {
      setHistory(prev);
      write(histKey, prev);
    }
  }, [history, histKey]);

  const setView = useCallback((v) => {
    write(viewKey, v);
    setViewState(v);
  }, [viewKey]);

  return { favorites, history, view, ready, toggleFavorite, recordView, clearHistory, setView };
}
