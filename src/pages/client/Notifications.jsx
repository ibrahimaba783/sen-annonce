import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import './Notifications.css';

// Catégorie d'une notification (d'après son type, son titre et son lien)
const categorieDe = (n) => {
  const texte = `${n.titre || ''} ${n.lien || ''}`.toLowerCase();
  if (n.type === 'message') return 'message';
  if (texte.includes('commande')) return 'commande';
  if (n.type === 'validation' || n.type === 'favori') return 'annonce';
  return 'autre';
};

const iconeDe = (n) => {
  const cat = categorieDe(n);
  if (cat === 'message') return { icone: '💬', cls: 'msg' };
  if (cat === 'commande') return { icone: '🛒', cls: 'cmd' };
  if (n.type === 'favori') return { icone: '❤️', cls: 'fav' };
  if (n.type === 'validation') return { icone: '✅', cls: 'ok' };
  if (n.type === 'admin') return { icone: '🛡️', cls: 'adm' };
  return { icone: '📢', cls: 'sys' };
};

const FILTRES = [
  { cle: 'toutes', label: 'Toutes', test: () => true },
  { cle: 'nonlues', label: 'Non lues', test: (n) => !n.lu },
  { cle: 'message', label: 'Messages', test: (n) => categorieDe(n) === 'message' },
  { cle: 'commande', label: 'Commandes', test: (n) => categorieDe(n) === 'commande' },
  { cle: 'annonce', label: 'Annonces', test: (n) => categorieDe(n) === 'annonce' },
];

const VIDES = {
  toutes: { emoji: '🔔', titre: 'Aucune notification', texte: 'Vos nouvelles notifications apparaîtront ici.' },
  nonlues: { emoji: '🎉', titre: 'Tout est à jour !', texte: 'Vous avez lu toutes vos notifications.' },
  message: { emoji: '💬', titre: 'Aucun message', texte: 'Les notifications de nouveaux messages apparaîtront ici.' },
  commande: { emoji: '🛒', titre: 'Aucune commande', texte: 'Les notifications de commandes apparaîtront ici.' },
  annonce: { emoji: '📢', titre: 'Aucune annonce concernée', texte: 'Publications, favoris et validations apparaîtront ici.' },
};

const ORDRE_GROUPES = ["Aujourd'hui", 'Hier', 'Cette semaine', 'Plus ancien'];

const groupeDe = (date) => {
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  const jour = new Date(date);
  jour.setHours(0, 0, 0, 0);
  const diff = Math.round((auj - jour) / 86400000);
  if (diff <= 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff < 7) return 'Cette semaine';
  return 'Plus ancien';
};

const tempsRelatif = (date) => {
  const min = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.floor(min / 60)} h`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

// Retire l'émoji placé au début de certains titres (l'icône est déjà affichée à gauche)
const nettoyerTitre = (t) => (t || '').replace(/^[^\p{L}\p{N}]+/u, '') || t || '';

const Notifications = () => {
  const navigate = useNavigate();
  const { fetchUnreadCounts } = useAuth();

  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [filtre, setFiltre] = useState('toutes');
  const [sortants, setSortants] = useState(() => new Set());
  const [nouveaux, setNouveaux] = useState(() => new Set());
  const [confirmLues, setConfirmLues] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const connus = useRef(new Set());

  const showToast = useCallback((text, type = 'ok') => {
    setToast({ text, type });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const charger = useCallback(async (silencieux = false) => {
    try {
      const { data } = await api.get('/notifications');
      const liste = Array.isArray(data) ? data : [];
      const ids = liste.map((n) => n._id);

      // Repère les notifications arrivées depuis le dernier chargement
      if (connus.current.size > 0) {
        const fraiches = ids.filter((id) => !connus.current.has(id));
        if (fraiches.length > 0) {
          setNouveaux(new Set(fraiches));
          showToast(`${fraiches.length} nouvelle${fraiches.length > 1 ? 's' : ''} notification${fraiches.length > 1 ? 's' : ''} 🔔`);
        }
      }
      connus.current = new Set(ids);

      setNotifs(liste);
      setErreur('');
    } catch (err) {
      if (!silencieux) setErreur(err.response?.data?.message || 'Impossible de charger les notifications');
    } finally {
      if (!silencieux) setLoading(false);
    }
  }, [showToast]);

  // Chargement puis actualisation automatique toutes les 15 secondes
  useEffect(() => {
    charger();
    const t = setInterval(() => charger(true), 15000);
    return () => clearInterval(t);
  }, [charger]);

  const marquerLue = async (n) => {
    if (n.lu) return;
    setNotifs((liste) => liste.map((x) => (x._id === n._id ? { ...x, lu: true } : x)));
    try {
      await api.patch(`/notifications/${n._id}/lu`);
      fetchUnreadCounts();
    } catch (err) {
      setNotifs((liste) => liste.map((x) => (x._id === n._id ? { ...x, lu: false } : x)));
      showToast('Impossible de marquer comme lue', 'err');
    }
  };

  const ouvrir = (n) => {
    marquerLue(n);
    if (n.lien) navigate(n.lien);
  };

  const toutLire = async () => {
    if (notifs.every((n) => n.lu)) return;
    setBusy(true);
    try {
      await api.patch('/notifications/lire-tout');
      setNotifs((liste) => liste.map((n) => ({ ...n, lu: true })));
      fetchUnreadCounts();
      showToast('Toutes les notifications sont lues ✓');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la mise à jour', 'err');
    } finally {
      setBusy(false);
    }
  };

  const supprimer = async (n, e) => {
    e.stopPropagation();
    setSortants((s) => new Set(s).add(n._id));
    try {
      await api.delete(`/notifications/${n._id}`);
      setTimeout(() => {
        setNotifs((liste) => liste.filter((x) => x._id !== n._id));
        setSortants((s) => {
          const c = new Set(s);
          c.delete(n._id);
          return c;
        });
        fetchUnreadCounts();
      }, 350);
    } catch (err) {
      setSortants((s) => {
        const c = new Set(s);
        c.delete(n._id);
        return c;
      });
      showToast(err.response?.data?.message || 'Erreur lors de la suppression', 'err');
    }
  };

  const supprimerLues = async () => {
    setBusy(true);
    try {
      await api.delete('/notifications/lues');
      setNotifs((liste) => liste.filter((n) => !n.lu));
      setConfirmLues(false);
      fetchUnreadCounts();
      showToast('Notifications lues supprimées 🧹');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la suppression', 'err');
    } finally {
      setBusy(false);
    }
  };

  const nonLues = notifs.filter((n) => !n.lu).length;
  const nbLues = notifs.length - nonLues;
  const filtreActif = FILTRES.find((f) => f.cle === filtre) || FILTRES[0];
  const visibles = notifs.filter(filtreActif.test);

  // Regroupe par jour en gardant l'ordre chronologique
  const groupes = ORDRE_GROUPES.map((nom) => ({ nom, items: visibles.filter((n) => groupeDe(n.createdAt) === nom) })).filter((g) => g.items.length > 0);

  let compteur = 0;

  return (
    <div className="no-root">
      {toast && <div className={`no-toast ${toast.type}`}>{toast.text}</div>}

      <section className="no-hero">
        <div className="no-hero-left">
          <div className={`no-bell ${nonLues > 0 ? 'ring' : ''}`}>🔔</div>
          <div>
            <h1>Notifications</h1>
            <p>
              {loading
                ? 'Chargement...'
                : nonLues > 0
                ? `${nonLues} notification${nonLues > 1 ? 's' : ''} non lue${nonLues > 1 ? 's' : ''}`
                : 'Vous êtes à jour ✨'}
            </p>
          </div>
        </div>
        <div className="no-hero-actions">
          <button className="no-btn white" onClick={toutLire} disabled={busy || nonLues === 0}>
            ✓ Tout marquer comme lu
          </button>
          <button className="no-btn glass" onClick={() => setConfirmLues(true)} disabled={busy || nbLues === 0}>
            🧹 Effacer les lues
          </button>
        </div>
      </section>

      <div className="no-filters">
        {FILTRES.map((f) => (
          <button key={f.cle} className={`no-pill ${filtre === f.cle ? 'on' : ''}`} onClick={() => setFiltre(f.cle)}>
            {f.label}
            <span className="n">{notifs.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="no-list" style={{ marginTop: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="no-skel" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : erreur ? (
        <div className="no-empty">
          <span className="emoji">⚠️</span>
          <h3>Oups, un problème est survenu</h3>
          <p style={{ marginBottom: 16 }}>{erreur}</p>
          <button className="no-btn primary" style={{ display: 'inline-flex' }} onClick={() => charger()}>
            Réessayer
          </button>
        </div>
      ) : visibles.length === 0 ? (
        <div className="no-empty" key={filtre}>
          <span className="emoji">{VIDES[filtre].emoji}</span>
          <h3>{VIDES[filtre].titre}</h3>
          <p>{VIDES[filtre].texte}</p>
        </div>
      ) : (
        <div key={filtre}>
          {groupes.map((g) => (
            <section key={g.nom} className="no-group">
              <h2>{g.nom}</h2>
              <div className="no-list">
                {g.items.map((n) => {
                  const ic = iconeDe(n);
                  const delai = Math.min(compteur++, 10) * 60;
                  return (
                    <article
                      key={n._id}
                      className={`no-item ${n.lu ? '' : 'unread'} ${sortants.has(n._id) ? 'out' : ''} ${nouveaux.has(n._id) ? 'fresh' : ''}`}
                      style={{ animationDelay: `${delai}ms` }}
                      onClick={() => ouvrir(n)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') ouvrir(n);
                      }}
                      tabIndex={0}
                      role="button"
                    >
                      <div className={`no-ico ${ic.cls}`}>{ic.icone}</div>

                      <div className="no-body">
                        <div className="no-title-row">
                          <h3 className="no-title">{nettoyerTitre(n.titre)}</h3>
                          {!n.lu && <span className="no-dot" aria-label="Non lue" />}
                        </div>
                        <p className="no-msg">{n.message}</p>
                        <div className="no-foot">
                          <span>🕒 {tempsRelatif(n.createdAt)}</span>
                          {n.lien && <span className="no-go">Voir →</span>}
                        </div>
                      </div>

                      <div className="no-actions">
                        {!n.lu && (
                          <button
                            className="no-mini read"
                            title="Marquer comme lue"
                            aria-label="Marquer comme lue"
                            onClick={(e) => {
                              e.stopPropagation();
                              marquerLue(n);
                            }}
                          >
                            ✓
                          </button>
                        )}
                        <button className="no-mini del" title="Supprimer" aria-label="Supprimer" onClick={(e) => supprimer(n, e)}>
                          🗑️
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {confirmLues && (
        <div className="no-overlay" onClick={() => setConfirmLues(false)}>
          <div className="no-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="emoji">🧹</div>
            <h3>Effacer les notifications lues ?</h3>
            <p>
              {nbLues} notification{nbLues > 1 ? 's' : ''} déjà lue{nbLues > 1 ? 's' : ''} {nbLues > 1 ? 'seront supprimées' : 'sera supprimée'}. Les non lues sont conservées.
            </p>
            <div className="no-modal-actions">
              <button className="no-btn gray" onClick={() => setConfirmLues(false)}>
                Annuler
              </button>
              <button className="no-btn danger" onClick={supprimerLues} disabled={busy}>
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;