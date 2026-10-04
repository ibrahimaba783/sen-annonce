import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

const LIBELLES_ROLES = { client: 'Client', vendeur: 'Vendeur', prestataire: 'Vendeur', admin: 'Administrateur' };

// Compteur animé de 0 jusqu'à la valeur
const Compteur = ({ valeur }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const debut = performance.now();
    const duree = 800;
    const tick = (t) => {
      const p = Math.min((t - debut) / duree, 1);
      setN(Math.round(valeur * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [valeur]);
  return <>{n.toLocaleString('fr-FR')}</>;
};

const Profile = () => {
  const { user, updateUser, logout, isVendeur, isAdmin, unreadMessages, unreadNotifications } = useAuth();
  const navigate = useNavigate();

  const [annoncesStats, setAnnoncesStats] = useState(null); // vendeur uniquement
  const [photoOk, setPhotoOk] = useState(true);
  const [confirmer, setConfirmer] = useState(false);

  // Récupère le profil complet (date de création, vérification, favoris)
  useEffect(() => {
    api
      .get('/auth/profil')
      .then((res) => updateUser(res.data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPhotoOk(true);
  }, [user?.photo]);

  // Statistiques des annonces (vendeur)
  useEffect(() => {
    if (!user?._id || !isVendeur) return undefined;
    let annule = false;

    api
      .get('/annonces/mes-annonces')
      .then((res) => {
        if (annule) return;
        const a = Array.isArray(res.data) ? res.data : [];
        setAnnoncesStats({
          enLigne: a.filter((x) => x.statut === 'validee' && x.actif !== false).length,
          vues: a.reduce((s, x) => s + (x.vues || 0), 0),
        });
      })
      .catch(() => {
        if (!annule) setAnnoncesStats({ enLigne: 0, vues: 0 });
      });

    return () => {
      annule = true;
    };
  }, [user?._id, isVendeur]);

  const nbFavoris = (user?.favoris || []).length;

  // Cartes de statistiques selon le rôle
  let statsItems = null;
  if (isVendeur) {
    if (annoncesStats) {
      statsItems = [
        { ico: '✅', valeur: annoncesStats.enLigne, label: 'En ligne' },
        { ico: '👁️', valeur: annoncesStats.vues, label: 'Vues' },
        { ico: '❤️', valeur: nbFavoris, label: 'Favoris' },
      ];
    }
  } else {
    statsItems = [
      { ico: '❤️', valeur: nbFavoris, label: 'Favoris' },
      { ico: '💬', valeur: unreadMessages || 0, label: 'Messages' },
      { ico: '🔔', valeur: unreadNotifications || 0, label: 'Alertes' },
    ];
  }

  const deconnecter = () => {
    logout();
    navigate('/');
  };

  const initiales = `${(user?.prenom || '').trim()[0] || ''}${(user?.nom || '').trim()[0] || ''}`.toUpperCase() || '?';
  const nomComplet = `${user?.prenom || ''} ${(user?.nom || '').trim()}`.trim();
  const membreDepuis = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;
  const roleLabel = LIBELLES_ROLES[user?.role] || 'Client';

  const menu = [
    { to: '/profil/infos', icon: '👤', label: 'Informations personnelles', sub: 'Photo, coordonnées et mot de passe' },
    ...(isVendeur ? [{ to: '/mes-annonces', icon: '📋', label: 'Mes annonces', sub: 'Gérer mes publications' }] : []),
    { to: '/favoris', icon: '❤️', label: 'Favoris', sub: 'Mes annonces préférées' },
    { to: '/messages', icon: '💬', label: 'Messages', sub: 'Mes conversations', badge: unreadMessages },
    { to: '/notifications', icon: '🔔', label: 'Notifications', sub: 'Mes alertes', badge: unreadNotifications },
    { to: '/parametres', icon: '⚙️', label: 'Paramètres', sub: "Préférences de l'application" },
    ...(isAdmin ? [{ to: '/admin', icon: '🛡️', label: 'Administration', sub: 'Tableau de bord admin' }] : []),
  ];

  return (
    <div className="pf-root">
      <section className="pf-hero">
        <div className="pf-cover" />
        <div className="pf-id">
          <div className="pf-avatar">
            {user?.photo && photoOk ? (
              <img src={imageUrl(user.photo)} alt={nomComplet} onError={() => setPhotoOk(false)} />
            ) : (
              <span>{initiales}</span>
            )}
          </div>
          <h1 className="pf-name">{nomComplet || 'Mon profil'}</h1>
          <div className="pf-mail">{user?.email}</div>
          <div className="pf-chips">
            <span className={`pf-chip ${isAdmin ? 'admin' : ''}`}>{roleLabel}</span>
            {user?.isVerified && <span className="pf-chip ok">✓ Vérifié</span>}
            {membreDepuis && <span className="pf-chip">Membre depuis {membreDepuis}</span>}
          </div>
          <Link to="/profil/infos" className="pf-edit">
            ✏️ Modifier mon profil
          </Link>
        </div>
      </section>

      <div className="pf-stats">
        {statsItems
          ? statsItems.map((s) => (
              <div key={s.label} className="pf-stat">
                <div className="ico">{s.ico}</div>
                <b>
                  <Compteur valeur={s.valeur} />
                </b>
                <span className="l">{s.label}</span>
              </div>
            ))
          : [0, 1, 2].map((i) => (
              <div key={i} className="pf-stat skel">
                <div className="ico" />
                <b>00</b>
                <span className="l">&nbsp;</span>
              </div>
            ))}
      </div>

      <nav className="pf-menu" aria-label="Menu du profil">
        {menu.map((item, i) => (
          <Link key={item.to} to={item.to} className="pf-item" style={{ animationDelay: `${0.15 + i * 0.06}s` }}>
            <span className="pf-ico">{item.icon}</span>
            <span className="pf-label">
              {item.label}
              <small>{item.sub}</small>
            </span>
            {item.badge > 0 && <span className="pf-badge">{item.badge > 99 ? '99+' : item.badge}</span>}
            <span className="pf-arrow">›</span>
          </Link>
        ))}
      </nav>

      <button className="pf-logout" style={{ animationDelay: `${0.2 + menu.length * 0.06}s` }} onClick={() => setConfirmer(true)}>
        🚪 Déconnexion
      </button>

      {confirmer && (
        <div className="pf-overlay" onClick={() => setConfirmer(false)}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="emoji">👋</div>
            <h3>Se déconnecter ?</h3>
            <p>Vous pourrez vous reconnecter à tout moment avec votre email et votre mot de passe.</p>
            <div className="pf-modal-actions">
              <button className="pf-mbtn gray" onClick={() => setConfirmer(false)}>
                Rester connecté
              </button>
              <button className="pf-mbtn red" onClick={deconnecter}>
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;