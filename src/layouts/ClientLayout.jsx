import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { imageUrl } from '../api/imageUrl';

// ---------- Icônes (SVG) ----------
const Svg = ({ size = 24, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const IconHome = (p) => <Svg {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>;
const IconGrid = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Svg>
);
const IconPlus = (p) => (
  <Svg {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);
const IconChat = (p) => <Svg {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.6-.8L3 21l1.9-5.4A8.4 8.4 0 1 1 21 11.5z" /></Svg>;
const IconUser = (p) => (
  <Svg {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
);
const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Svg>
);
const IconLogin = (p) => (
  <Svg {...p}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </Svg>
);
const IconBell = (p) => (
  <Svg {...p}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Svg>
);

// Style du bouton de déconnexion (icône seule, avec effets au survol)
const logoutStyles = `
.logout-icon-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, #f43f5e 0%, #dc2626 100%);
  box-shadow: 0 4px 14px rgba(244, 63, 94, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}
.logout-icon-btn svg {
  transition: transform 0.25s ease;
}
.logout-icon-btn:hover {
  transform: translateY(-2px) scale(1.06);
  box-shadow: 0 8px 20px rgba(244, 63, 94, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  filter: brightness(1.08);
}
.logout-icon-btn:hover svg {
  transform: translateX(2px);
}
.logout-icon-btn:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(244, 63, 94, 0.4);
}
.logout-icon-btn:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .logout-icon-btn,
  .logout-icon-btn svg {
    transition: none;
  }
}
`;

const ClientLayout = () => {
  const { user, logout, unreadMessages, unreadNotifications, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // NavItems pour la barre basse mobile
  const navItems = user
    ? [
        { to: '/', label: 'Accueil', icon: <IconHome /> },
        { to: '/categories', label: 'Catégories', icon: <IconGrid /> },
        { to: '/publier', label: 'Publier', icon: <IconPlus size={26} />, isFab: true },
        { to: '/messages', label: 'Messages', icon: <IconChat />, count: unreadMessages },
        {
          to: '/profil',
          label: 'Profil',
          icon: user?.photo ? (
            <img
              src={imageUrl(user.photo)}
              alt="Profil"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block',
                margin: '0 auto',
                border: '1.5px solid currentColor',
              }}
            />
          ) : (
            <IconUser />
          ),
        },
      ]
    : [
        { to: '/', label: 'Accueil', icon: <IconHome /> },
        { to: '/categories', label: 'Catégories', icon: <IconGrid /> },
        { to: '/recherche', label: 'Recherche', icon: <IconSearch /> },
        { to: '/connexion', label: 'Connexion', icon: <IconLogin /> },
      ];

  return (
    <div className="app-shell">
      <style>{logoutStyles}</style>

      {/* Top Header */}
      <header className="top-bar-navy">
        <NavLink to="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="SenAnnonce Logo" style={{ height: 38, width: 'auto', borderRadius: 8, objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>SenAnnonce</span>
        </NavLink>

        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`} end>
            Annonces
          </NavLink>

          {user ? (
            <>
              <NavLink to="/mes-annonces" className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}>
                Mes annonces
              </NavLink>
              <NavLink to="/favoris" className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}>
                Favoris
              </NavLink>

              {isAdmin && (
                <NavLink to="/admin" className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}>
                  Admin
                </NavLink>
              )}

              <NavLink to="/notifications" className="nav-link-item" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 2 }} aria-label="Notifications">
                <IconBell size={20} />
                {unreadNotifications > 0 && (
                  <span style={{ background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10, marginLeft: 2 }}>
                    {unreadNotifications}
                  </span>
                )}
              </NavLink>

              <NavLink to="/profil" className="nav-link-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {user.photo ? (
                  <img src={imageUrl(user.photo)} alt="avatar" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#3b82f6', color: 'white', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {`${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase()}
                  </div>
                )}
                <span>{user.prenom}</span>
              </NavLink>

              <button
                type="button"
                className="logout-icon-btn"
                onClick={handleLogout}
                title="Se déconnecter"
                aria-label="Se déconnecter"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <NavLink to="/connexion" className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}>
                Connexion
              </NavLink>
              <NavLink to="/inscription" className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}>
                Créer un compte
              </NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="app-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${item.isFab ? 'nav-item-fab' : ''}`}
            end={item.to === '/'}
          >
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.isFab ? (
                <div className="fab-circle" style={{ color: '#fff' }}>
                  {item.icon}
                </div>
              ) : (
                <span className="nav-icon" style={{ display: 'inline-flex' }}>{item.icon}</span>
              )}
              {item.count > 0 && (
                <span className="badge-count" style={{ position: 'absolute', top: -4, right: -8, fontSize: 10, padding: '2px 5px' }}>
                  {item.count}
                </span>
              )}
            </div>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default ClientLayout;