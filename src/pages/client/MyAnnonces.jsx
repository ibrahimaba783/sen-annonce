import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import ImageSlideshow from '../../components/ImageSlideshow';
import './MyAnnonces.css';

const ONGLETS = [
  { cle: 'en_ligne', label: 'En ligne' },
  { cle: 'en_attente', label: 'En attente' },
  { cle: 'expirees', label: 'Expirées' },
];

// Classe chaque annonce dans un onglet
const ongletDe = (a) => {
  if (a.statut === 'en_attente') return 'en_attente';
  if (a.statut === 'refusee' || a.actif === false) return 'expirees';
  return 'en_ligne';
};

const badgeDe = (a) => {
  if (a.statut === 'en_attente') return { label: 'En attente de validation', cls: 'wait' };
  if (a.statut === 'refusee') return { label: 'Refusée', cls: 'ko' };
  if (a.actif === false) return { label: 'Hors ligne', cls: 'off' };
  return { label: 'En ligne', cls: 'on' };
};

const VIDES = {
  en_ligne: { emoji: '🛒', titre: 'Aucune annonce en ligne', texte: 'Publiez une annonce pour la voir apparaître ici et sur la page d\'accueil.' },
  en_attente: { emoji: '⏳', titre: 'Rien en attente', texte: 'Les annonces en cours de validation par un administrateur apparaissent ici.' },
  expirees: { emoji: '📦', titre: 'Aucune annonce expirée', texte: 'Les annonces masquées, vendues ou refusées apparaissent ici.' },
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

  const compte = (cle) => annonces.filter((a) => ongletDe(a) === cle).length;
  const visibles = annonces.filter((a) => ongletDe(a) === onglet);
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
          ➕ Publier une annonce
        </Link>
      </div>

      {!loading && !erreur && (
        <div className="ma-stats">
          <div className="ma-stat">
            <div className="ma-stat-ico">✅</div>
            <div>
              <b><Compteur valeur={compte('en_ligne')} /></b>
              <span className="l">En ligne</span>
            </div>
          </div>
          <div className="ma-stat">
            <div className="ma-stat-ico">⏳</div>
            <div>
              <b><Compteur valeur={compte('en_attente')} /></b>
              <span className="l">En attente</span>
            </div>
          </div>
          <div className="ma-stat">
            <div className="ma-stat-ico">👁️</div>
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
          <span className="emoji">⚠️</span>
          <h3>Oups, un problème est survenu</h3>
          <p>{erreur}</p>
          <button className="ma-btn primary" style={{ display: 'inline-flex', padding: '12px 22px' }} onClick={charger}>
            Réessayer
          </button>
        </div>
      ) : visibles.length === 0 ? (
        <div className="ma-empty" key={onglet}>
          <span className="emoji">{VIDES[onglet].emoji}</span>
          <h3>{VIDES[onglet].titre}</h3>
          <p>{VIDES[onglet].texte}</p>
          {onglet === 'en_ligne' && (
            <Link to="/publier" className="ma-publish" style={{ display: 'inline-flex' }}>
              ➕ Publier une annonce
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
                    <div className="ma-noimg">🛍️</div>
                  )}
                  {photos.length > 1 && <span className="ma-photos">📷 {photos.length}</span>}
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
                    {a.ville && <span className="ma-chip">📍 {a.ville}</span>}
                    <span className="ma-chip">👁️ {a.vues || 0}</span>
                    {a.createdAt && (
                      <span className="ma-chip">🗓️ {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    )}
                    {a.signalements > 0 && (
                      <span className="ma-chip warn">
                        🚩 {a.signalements} signalement{a.signalements > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="ma-actions">
                  <Link to={`/annonce/${a._id}`} className="ma-btn soft">
                    👁️ Voir
                  </Link>
                  <button className="ma-btn soft" onClick={() => navigate(`/annonce/modifier/${a._id}`)}>
                    ✏️ Modifier
                  </button>
                  {a.statut === 'validee' && (
                    <button className={`ma-btn ${a.actif === false ? 'green' : 'gray'}`} onClick={() => basculer(a)} disabled={busyId === a._id}>
                      {a.actif === false ? '↺ Réactiver' : '🙈 Masquer'}
                    </button>
                  )}
                  <button className="ma-btn danger" onClick={() => setASupprimer(a)} disabled={busyId === a._id}>
                    🗑️ Supprimer
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
            <div className="emoji">🗑️</div>
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