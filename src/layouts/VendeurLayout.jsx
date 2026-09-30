import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { imageUrl } from '../api/imageUrl';

const VendeurLayout = () => {
  const { user, logout, unreadMessages, unreadNotifications } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/demarrage');
  };

  const navItems = user
    ? [
        { to: '/', label: 'Accueil', icon: '🏠' },
        { to: '/categories', label: 'Catégories', icon: '📂' },
        { to: '/publier', label: 'Publier', icon: '➕' },
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
      <div className="top-bar">
        <span className="top-bar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          Annonces.sn
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <button
                onClick={() => navigate('/notifications')}
                className="top-bar-logout"
                title="Notifications"
                style={{ position: 'relative' }}
              >
                🔔
                {unreadNotifications > 0 && (
                  <span className="badge-count" style={{ position: 'absolute', top: -4, right: -4, fontSize: 10, padding: '2px 5px' }}>
                    {unreadNotifications}
                  </span>
                )}
              </button>
              <button onClick={handleLogout} className="top-bar-logout" title="Déconnexion">
                🚪
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/connexion')}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              Se connecter
            </button>
          )}
        </div>
      </div>
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.to === '/'}
          >
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="nav-icon">{item.icon}</span>
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
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};

export default VendeurLayout;