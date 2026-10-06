import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

const LIBELLES_ROLES = { client: 'Client', vendeur: 'Vendeur', prestataire: 'Vendeur', admin: 'Administrateur' };

// ---------- Icônes (SVG) ----------
const Svg = ({ size = 22, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const IUser = (p) => (
  <Svg {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
);
const IList = (p) => (
  <Svg {...p}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
  </Svg>
);
const IHeart = (p) => <Svg {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></Svg>;
const IChat = (p) => <Svg {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.6-.8L3 21l1.9-5.4A8.4 8.4 0 1 1 21 11.5z" /></Svg>;
const IBell = (p) => (
  <Svg {...p}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Svg>
);
const ISliders = (p) => (
  <Svg {...p}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </Svg>
);
const IShield = (p) => <Svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>;
const ICheck = (p) => (
  <Svg {...p}>
    <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </Svg>
);
const IEye = (p) => (
  <Svg {...p}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
const IPencil = (p) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
);
const ILogout = (p) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Svg>
);

// Couleur des icônes de statistiques (suit la couleur de fond de chaque carte)
const COULEURS_STATS = ['#15803d', '#1d4ed8', '#dc2626'];

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
        { ico: <ICheck />, valeur: annoncesStats.enLigne, label: 'En ligne' },
        { ico: <IEye />, valeur: annoncesStats.vues, label: 'Vues' },
        { ico: <IHeart />, valeur: nbFavoris, label: 'Favoris' },
      ];
    }
  } else {
    statsItems = [
      { ico: <IHeart />, valeur: nbFavoris, label: 'Favoris' },
      { ico: <IChat />, valeur: unreadMessages || 0, label: 'Messages' },
      { ico: <IBell />, valeur: unreadNotifications || 0, label: 'Alertes' },
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
    { to: '/profil/infos', icon: <IUser />, label: 'Informations personnelles', sub: 'Photo, coordonnées et mot de passe' },
    ...(isVendeur ? [{ to: '/mes-annonces', icon: <IList />, label: 'Mes annonces', sub: 'Gérer mes publications' }] : []),
    { to: '/favoris', icon: <IHeart />, label: 'Favoris', sub: 'Mes annonces préférées' },
    { to: '/messages', icon: <IChat />, label: 'Messages', sub: 'Mes conversations', badge: unreadMessages },
    { to: '/notifications', icon: <IBell />, label: 'Notifications', sub: 'Mes alertes', badge: unreadNotifications },
    { to: '/parametres', icon: <ISliders />, label: 'Paramètres', sub: "Préférences de l'application" },
    ...(isAdmin ? [{ to: '/admin', icon: <IShield />, label: 'Administration', sub: 'Tableau de bord admin' }] : []),
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
            <IPencil size={16} /> Modifier mon profil
          </Link>
        </div>
      </section>

      <div className="pf-stats">
        {statsItems
          ? statsItems.map((s, i) => (
              <div key={s.label} className="pf-stat">
                <div className="ico" style={{ color: COULEURS_STATS[i] }}>{s.ico}</div>
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
            <span className="pf-ico" style={{ color: '#2563eb' }}>{item.icon}</span>
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
        <ILogout size={18} /> Déconnexion
      </button>

      {confirmer && (
        <div className="pf-overlay" onClick={() => setConfirmer(false)}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="emoji" style={{ color: '#dc2626', display: 'flex', justifyContent: 'center' }}>
              <ILogout size={44} />
            </div>
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