import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { imageUrl } from '../api/imageUrl';

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
  const { user, logout, unreadMessages, unreadNotifications, cartCount, isClient, isVendeur, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // NavItems pour la barre basse mobile
  const navItems = user
    ? [
        { to: '/', label: 'Accueil', icon: '🏠' },
        { to: '/categories', label: 'Catégories', icon: '📂' },
        ...(isVendeur ? [{ to: '/publier', label: 'Publier', icon: '➕', isFab: true }] : [{ to: '/panier', label: 'Panier', icon: '🛒', count: cartCount }]),
        { to: '/messages', label: 'Messages', icon: '💬', count: unreadMessages },
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
            '👤'
          ),
        },
      ]
    : [
        { to: '/', label: 'Accueil', icon: '🏠' },
        { to: '/categories', label: 'Catégories', icon: '📂' },
        { to: '/recherche', label: 'Recherche', icon: '🔍' },
        { to: '/connexion', label: 'Connexion', icon: '🔑' },
      ];

  return (
    <div className="app-shell">
      <style>{logoutStyles}</style>

      {/* Top Navy Header */}
      <header className="top-bar-navy">
        <NavLink to="/" className="brand">
          <span>Annonces+</span>
        </NavLink>

        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`} end>
            Annonces
          </NavLink>

          {user ? (
            <>
              {isClient && (
                <>
                  <NavLink to="/panier" className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
                    Panier 🛒
                    {cartCount > 0 && (
                      <span style={{ background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10, marginLeft: 4 }}>
                        {cartCount}
                      </span>
                    )}
                  </NavLink>
                  <NavLink to="/mes-commandes" className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}>
                    Commandes
                  </NavLink>
                </>
              )}

              {isVendeur && (
                <>
                  <NavLink to="/mes-annonces" className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}>
                    Mes annonces
                  </NavLink>
                  <NavLink to="/vendeur/commandes" className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}>
                    Commandes reçues
                  </NavLink>
                </>
              )}

              {isAdmin && (
                <NavLink to="/admin" className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}>
                  Admin
                </NavLink>
              )}

              <NavLink to="/notifications" className="nav-link-item" style={{ position: 'relative' }}>
                🔔
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
                <div className="fab-circle">➕</div>
              ) : (
                <span className="nav-icon">{item.icon}</span>
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