import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import ImageSlideshow from '../../components/ImageSlideshow';
import './MyAnnonces.css';

// ---------- Icônes (SVG) ----------
const Svg = ({ size = 16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
    {children}
  </svg>
);
const IPlus = (p) => (
  <Svg {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);
const ICheck = (p) => (
  <Svg {...p}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </Svg>
);
const IEye = (p) => (
  <Svg {...p}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
const IEyeOff = (p) => (
  <Svg {...p}>
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </Svg>
);
const IPin = (p) => (
  <Svg {...p}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Svg>
);
const ICalendar = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </Svg>
);
const IFlag = (p) => (
  <Svg {...p}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </Svg>
);
const ICamera = (p) => (
  <Svg {...p}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </Svg>
);
const IPencil = (p) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
);
const ITrash = (p) => (
  <Svg {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </Svg>
);
const IRefresh = (p) => (
  <Svg {...p}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </Svg>
);
const IAlert = (p) => (
  <Svg {...p}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Svg>
);
const IBag = (p) => (
  <Svg {...p}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </Svg>
);

// Alignement icône + texte dans les petites pastilles
const chipFlex = { display: 'inline-flex', alignItems: 'center', gap: 5 };

// ---------- Onglets ----------
const ONGLETS = [
  { cle: 'en_ligne', label: 'En ligne' },
  { cle: 'desactive', label: 'Désactivé' },
  { cle: 'signalement', label: 'Signalement' },
];

// Une annonce appartient à un onglet selon son état
const dansOnglet = (a, cle) => {
  if (cle === 'en_ligne') return a.statut === 'validee' && a.actif !== false;
  if (cle === 'desactive') return a.statut !== 'validee' || a.actif === false;
  return a.signalements > 0; // signalement
};

const badgeDe = (a) => {
  if (a.statut === 'en_attente') return { label: 'En attente de validation', cls: 'wait' };
  if (a.statut === 'refusee') return { label: 'Refusée', cls: 'ko' };
  if (a.actif === false) return { label: 'Hors ligne', cls: 'off' };
  return { label: 'En ligne', cls: 'on' };
};

const VIDES = {
  en_ligne: {
    icone: <IBag size={56} />,
    titre: 'Aucune annonce en ligne',
    texte: "Publiez une annonce pour la voir apparaître ici et sur la page d'accueil.",
  },
  desactive: {
    icone: <IEyeOff size={56} />,
    titre: 'Aucune annonce désactivée',
    texte: 'Les annonces masquées, en attente de validation ou refusées apparaissent ici.',
  },
  signalement: {
    icone: <IFlag size={56} />,
    titre: 'Aucun signalement',
    texte: 'Les annonces signalées par des utilisateurs apparaissent ici.',
  },
};

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

const MyAnnonces = () => {
  const navigate = useNavigate();
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [onglet, setOnglet] = useState('en_ligne');
  const [busyId, setBusyId] = useState(null);
  const [sortantId, setSortantId] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((text, type = 'ok') => {
    setToast({ text, type });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const charger = useCallback(() => {
    setLoading(true);
    setErreur('');
    api
      .get('/annonces/mes-annonces')
      .then((res) => setAnnonces(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setErreur(err.response?.data?.message || 'Impossible de charger vos annonces'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const basculer = async (a) => {
    setBusyId(a._id);
    try {
      const { data } = await api.patch(`/annonces/${a._id}/statut`);
      setAnnonces((liste) => liste.map((x) => (x._id === a._id ? { ...x, actif: data.actif } : x)));
      showToast(data.actif ? 'Annonce réactivée : elle est de nouveau visible ✓' : "Annonce masquée de la page d'accueil");
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la modification', 'err');
    } finally {
      setBusyId(null);
    }
  };

  const supprimer = async () => {
    const a = aSupprimer;
    if (!a) return;
    setBusyId(a._id);
    try {
      await api.delete(`/annonces/${a._id}`);
      setASupprimer(null);
      setSortantId(a._id);
      setTimeout(() => {
        setAnnonces((liste) => liste.filter((x) => x._id !== a._id));
        setSortantId(null);
      }, 350);
      showToast('Annonce supprimée');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la suppression', 'err');
    } finally {
      setBusyId(null);
    }
  };

  const compte = (cle) => annonces.filter((a) => dansOnglet(a, cle)).length;
  const visibles = annonces.filter((a) => dansOnglet(a, onglet));
  const totalVues = annonces.reduce((s, a) => s + (a.vues || 0), 0);
  const indexOnglet = ONGLETS.findIndex((o) => o.cle === onglet);

  return (
    <div className="ma-root">
      {toast && <div className={`ma-toast ${toast.type}`}>{toast.text}</div>}

      <div className="ma-head">
        <div>
          <h1>Mes annonces</h1>
          <p>
            {annonces.length} annonce{annonces.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <Link to="/publier" className="ma-publish">
          <IPlus size={18} /> Publier une annonce
        </Link>
      </div>

      {!loading && !erreur && (
        <div className="ma-stats">
          <div className="ma-stat">
            <div className="ma-stat-ico" style={{ color: '#15803d' }}>
              <ICheck size={22} />
            </div>
            <div>
              <b><Compteur valeur={compte('en_ligne')} /></b>
              <span className="l">En ligne</span>
            </div>
          </div>
          <div className="ma-stat">
            <div className="ma-stat-ico" style={{ color: '#b45309' }}>
              <IEyeOff size={22} />
            </div>
            <div>
              <b><Compteur valeur={compte('desactive')} /></b>
              <span className="l">Désactivé</span>
            </div>
          </div>
          <div className="ma-stat">
            <div className="ma-stat-ico" style={{ color: '#1d4ed8' }}>
              <IEye size={22} />
            </div>
            <div>
              <b><Compteur valeur={totalVues} /></b>
              <span className="l">Vues au total</span>
            </div>
          </div>
        </div>
      )}

      <div className="ma-tabs" role="tablist">
        <span className="ma-tab-ind" style={{ transform: `translateX(${indexOnglet * 100}%)` }} />
        {ONGLETS.map((o) => (
          <button key={o.cle} role="tab" aria-selected={onglet === o.cle} className={`ma-tab ${onglet === o.cle ? 'on' : ''}`} onClick={() => setOnglet(o.cle)}>
            {o.label}
            <span className="n">{compte(o.cle)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ma-list">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ma-skel" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : erreur ? (
        <div className="ma-empty">
          <span className="emoji" style={{ color: '#dc2626' }}>
            <IAlert size={56} />
          </span>
          <h3>Oups, un problème est survenu</h3>
          <p>{erreur}</p>
          <button className="ma-btn primary" style={{ display: 'inline-flex', padding: '12px 22px' }} onClick={charger}>
            Réessayer
          </button>
        </div>
      ) : visibles.length === 0 ? (
        <div className="ma-empty" key={onglet}>
          <span className="emoji" style={{ color: '#2563eb' }}>{VIDES[onglet].icone}</span>
          <h3>{VIDES[onglet].titre}</h3>
          <p>{VIDES[onglet].texte}</p>
          {onglet === 'en_ligne' && (
            <Link to="/publier" className="ma-publish" style={{ display: 'inline-flex' }}>
              <IPlus size={18} /> Publier une annonce
            </Link>
          )}
        </div>
      ) : (
        <div className="ma-list" key={onglet}>
          {visibles.map((a, i) => {
            const badge = badgeDe(a);
            const photos = (a.images || []).filter(Boolean);
            return (
              <article
                key={a._id}
                className={`ma-card ${sortantId === a._id ? 'out' : ''} ${a.actif === false ? 'dim' : ''}`}
                style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}
              >
                <Link to={`/annonce/${a._id}`} className="ma-thumb" aria-label={a.titre}>
                  {photos.length > 0 ? (
                    <ImageSlideshow images={photos} alt={a.titre} offset={(i % 8) * 450} />
                  ) : (
                    <div className="ma-noimg" style={{ color: '#2563eb' }}>
                      <IBag size={34} />
                    </div>
                  )}
                  {photos.length > 1 && (
                    <span className="ma-photos" style={chipFlex}>
                      <ICamera size={12} /> {photos.length}
                    </span>
                  )}
                </Link>

                <div className="ma-info">
                  <div className="ma-row">
                    <Link to={`/annonce/${a._id}`} className="ma-title">
                      {a.titre}
                    </Link>
                    <span className={`ma-badge ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="ma-price">{a.prix?.toLocaleString('fr-FR')} FCFA</div>
                  <div className="ma-meta">
                    {a.categorie?.nom && <span className="ma-chip">{a.categorie.nom}</span>}
                    {a.ville && (
                      <span className="ma-chip" style={chipFlex}>
                        <IPin size={13} /> {a.ville}
                      </span>
                    )}
                    <span className="ma-chip" style={chipFlex}>
                      <IEye size={13} /> {a.vues || 0}
                    </span>
                    {a.createdAt && (
                      <span className="ma-chip" style={chipFlex}>
                        <ICalendar size={13} /> {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {a.signalements > 0 && (
                      <span className="ma-chip warn" style={chipFlex}>
                        <IFlag size={13} /> {a.signalements} signalement{a.signalements > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ma-actions">
                  <Link to={`/annonce/${a._id}`} className="ma-btn soft">
                    <IEye /> Voir
                  </Link>
                  <button className="ma-btn soft" onClick={() => navigate(`/annonce/modifier/${a._id}`)}>
                    <IPencil /> Modifier
                  </button>
                  {a.statut === 'validee' && (
                    <button className={`ma-btn ${a.actif === false ? 'green' : 'gray'}`} onClick={() => basculer(a)} disabled={busyId === a._id}>
                      {a.actif === false ? (
                        <>
                          <IRefresh /> Réactiver
                        </>
                      ) : (
                        <>
                          <IEyeOff /> Masquer
                        </>
                      )}
                    </button>
                  )}
                  <button className="ma-btn danger" onClick={() => setASupprimer(a)} disabled={busyId === a._id}>
                    <ITrash /> Supprimer
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {aSupprimer && (
        <div className="ma-overlay" onClick={() => setASupprimer(null)}>
          <div className="ma-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="emoji" style={{ color: '#dc2626', display: 'flex', justifyContent: 'center' }}>
              <ITrash size={44} />
            </div>
            <h3>Supprimer cette annonce ?</h3>
            <p>
              « {aSupprimer.titre} » sera supprimée définitivement. Si vous voulez seulement la retirer de l'accueil, utilisez plutôt « Masquer ».
            </p>
            <div className="ma-modal-actions">
              <button className="ma-btn gray" onClick={() => setASupprimer(null)}>
                Annuler
              </button>
              <button className="ma-btn solid-danger" onClick={supprimer} disabled={busyId === aSupprimer._id}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAnnonces;