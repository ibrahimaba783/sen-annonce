import { useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminTheme.css';

const menu = [
  { to: '/admin', label: 'Dashboard', icon: '📊', sous: "Vue d'ensemble de la plateforme" },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: '👥', sous: 'Gérez les comptes et les rôles' },
  { to: '/admin/annonces', label: 'Annonces', icon: '📋', sous: 'Modérez les annonces publiées' },
  { to: '/admin/categories', label: 'Catégories', icon: '📂', sous: 'Organisez les catégories' },
  { to: '/admin/signalements', label: 'Signalements', icon: '🚨', sous: 'Traitez les signalements reçus' },
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [ouvert, setOuvert] = useState(false);

  // Referme le menu mobile quand on change de page
  useEffect(() => {
    setOuvert(false);
  }, [pathname]);

  // Page courante : la correspondance la plus longue
  const courant =
    [...menu].sort((a, b) => b.to.length - a.to.length).find((m) => pathname === m.to || pathname.startsWith(`${m.to}/`)) || menu[0];

  const initiales = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'A';
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="admin-shell">
      <div className={`admin-overlay ${ouvert ? 'show' : ''}`} onClick={() => setOuvert(false)} />

      <aside className={`admin-sidebar ${ouvert ? 'open' : ''}`}>
        <div className="admin-logo">
          <span className="admin-logo-ico">⚡</span>
          <span>
            Annonces<b>+</b>
            <small>Administration</small>
          </span>
        </div>

        <nav>
          {menu.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              style={{ '--i': i }}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="admin-ico">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <span className="admin-avatar">{initiales}</span>
            <span className="admin-user-txt">
              <strong>
                {user?.prenom} {user?.nom}
              </strong>
              <small>Administrateur</small>
            </span>
          </div>
          <button type="button" onClick={logout} className="btn-logout">
            ⏻ Déconnexion
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-burger" onClick={() => setOuvert((o) => !o)} aria-label="Ouvrir le menu" aria-expanded={ouvert}>
            <i />
            <i />
            <i />
          </button>
          <div key={courant.to} className="admin-topbar-title">
            <h1>
              <span>{courant.icon}</span> {courant.label}
            </h1>
            <p>{courant.sous}</p>
          </div>
          <div className="admin-topbar-right">
            <span className="admin-date">📅 {date}</span>
            <Link to="/" className="admin-site-link">
              Voir le site <span>→</span>
            </Link>
          </div>
        </header>

        <main className="admin-content">
          <div key={pathname} className="admin-page">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;