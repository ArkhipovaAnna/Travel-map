import { useEffect } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { usePlaces } from './PlacesContext';
import HomePage from './pages/HomePage';
import VisitedPage from './pages/VisitedPage';
import PlannedPage from './pages/PlannedPage';
import PlacePage from './pages/PlacePage';

export default function App() {
  const { error, reload, notice, clearNotice } = usePlaces();

  // уведомление об ошибке исчезает само
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(clearNotice, 6000);
    return () => clearTimeout(timer);
  }, [notice, clearNotice]);

  return (
    <div className="app">
      <header className="header">
        <NavLink to="/" className="logo">
          <span className="logo-globe">🌍</span> Моя карта путешествий
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end>🗺️ Карта</NavLink>
          <NavLink to="/visited">✅ Побывал</NavLink>
          <NavLink to="/planned">✈️ Хочу посетить</NavLink>
        </nav>
      </header>

      <main className="main">
        {error && (
          <div className="banner-error" role="alert">
            {error}{' '}
            <button type="button" className="btn ghost small" onClick={reload}>Повторить</button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/visited" element={<VisitedPage />} />
          <Route path="/planned" element={<PlannedPage />} />
          <Route path="/place/:id" element={<PlacePage />} />
          <Route path="*" element={<p className="empty">Страница не найдена 🧭</p>} />
        </Routes>
      </main>

      {notice && (
        <div className="toast" role="alert">
          {notice}
          <button type="button" aria-label="Закрыть уведомление" onClick={clearNotice}>✕</button>
        </div>
      )}

      <footer className="footer">Путешествуй, отмечай, вспоминай ✨</footer>
    </div>
  );
}
