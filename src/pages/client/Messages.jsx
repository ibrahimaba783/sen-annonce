import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import { useAuth } from '../../context/AuthContext';
import './Messages.css';

const COULEURS = [
  ['#3b82f6', '#1d4ed8'],
  ['#8b5cf6', '#6d28d9'],
  ['#ec4899', '#be185d'],
  ['#f59e0b', '#d97706'],
  ['#10b981', '#047857'],
  ['#06b6d4', '#0e7490'],
];

const couleurDe = (id = '') => {
  const somme = Array.from(String(id)).reduce((s, c) => s + c.charCodeAt(0), 0);
  const [a, b] = COULEURS[somme % COULEURS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
};

const initiales = (c) => `${(c?.prenom || '').trim()[0] || ''}${(c?.nom || '').trim()[0] || ''}`.toUpperCase() || '?';

// Heure du jour, « Hier », jour de la semaine ou date
const heureCourte = (date) => {
  const d = new Date(date);
  const auj = new Date();
  const j0 = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate());
  const j1 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((j0 - j1) / 86400000);
  if (diff <= 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Hier';
  if (diff < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

const texteApercu = (m) => (m?.contenu || '').replace(/\s+/g, ' ').trim() || 'Nouveau message';

const Messages = () => {
  const navigate = useNavigate();
  const { user, fetchUnreadCounts } = useAuth();

  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('toutes');
  const [frais, setFrais] = useState(() => new Set());
  const [sansPhoto, setSansPhoto] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const connus = useRef(null); // contactId -> id du dernier message vu

  const showToast = useCallback((text) => {
    setToast(text);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const charger = useCallback(
    async (silencieux = false) => {
      try {
        const { data } = await api.get('/messages/conversations');
        const liste = (Array.isArray(data) ? data : [])
          .filter((c) => c.contact && c.dernierMessage)
          .sort((a, b) => new Date(b.dernierMessage.createdAt) - new Date(a.dernierMessage.createdAt));

        // Repère les conversations qui ont reçu un nouveau message depuis le dernier chargement
        if (connus.current) {
          const nouveaux = liste.filter((c) => {
            const vu = connus.current.get(c.contact._id);
            const moi = c.dernierMessage.expediteur?._id === user?._id;
            return vu !== c.dernierMessage._id && !moi;
          });
          if (nouveaux.length > 0) {
            setFrais(new Set(nouveaux.map((c) => c.contact._id)));
            showToast(
              nouveaux.length === 1
                ? `💬 Nouveau message de ${nouveaux[0].contact.prenom || 'un contact'}`
                : `💬 ${nouveaux.length} nouveaux messages`
            );
            fetchUnreadCounts?.();
          }
        }
        connus.current = new Map(liste.map((c) => [c.contact._id, c.dernierMessage._id]));

        setConvs(liste);
        setErreur('');
      } catch (err) {
        if (!silencieux) setErreur(err.response?.data?.message || 'Impossible de charger les messages');
      } finally {
        if (!silencieux) setLoading(false);
      }
    },
    [user?._id, showToast, fetchUnreadCounts]
  );

  // Chargement puis actualisation automatique toutes les 10 secondes
  useEffect(() => {
    charger();
    const t = setInterval(() => charger(true), 10000);
    return () => clearInterval(t);
  }, [charger]);

  const ouvrir = (c) => navigate(`/conversation/${c.contact._id}`);

  const nbNonLues = convs.filter((c) => c.nonLus > 0).length;
  const totalNonLus = convs.reduce((s, c) => s + (c.nonLus || 0), 0);

  const terme = recherche.trim().toLowerCase();
  const visibles = convs.filter((c) => {
    if (filtre === 'nonlues' && !(c.nonLus > 0)) return false;
    if (!terme) return true;
    const nom = `${c.contact.prenom || ''} ${c.contact.nom || ''}`.toLowerCase();
    return nom.includes(terme) || texteApercu(c.dernierMessage).toLowerCase().includes(terme);
  });

  return (
    <div className="ms-root">
      {toast && <div className="ms-toast">{toast}</div>}

      <section className="ms-hero">
        <div className="ms-hero-left">
          <div className="ms-ico">💬</div>
          <div>
            <h1>Messages</h1>
            <p>
              {loading
                ? 'Chargement...'
                : totalNonLus > 0
                ? `${totalNonLus} message${totalNonLus > 1 ? 's' : ''} à lire`
                : 'Vous êtes à jour ✨'}
            </p>
          </div>
        </div>
        {!loading && !erreur && (
          <div className="ms-hero-stats">
            <div className="ms-chip">
              <b>{convs.length}</b>
              <span>Conversation{convs.length > 1 ? 's' : ''}</span>
            </div>
            <div className={`ms-chip ${nbNonLues > 0 ? 'hot' : ''}`}>
              <b>{totalNonLus}</b>
              <span>Non lu{totalNonLus > 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </section>

      {!loading && !erreur && convs.length > 0 && (
        <>
          <div className="ms-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une personne ou un message..." aria-label="Rechercher une conversation" />
            {recherche && (
              <button className="ms-clear" onClick={() => setRecherche('')} aria-label="Effacer la recherche">
                ✕
              </button>
            )}
          </div>

          <div className="ms-filters">
            <button className={`ms-pill ${filtre === 'toutes' ? 'on' : ''}`} onClick={() => setFiltre('toutes')}>
              Toutes <span className="n">{convs.length}</span>
            </button>
            <button className={`ms-pill ${filtre === 'nonlues' ? 'on' : ''}`} onClick={() => setFiltre('nonlues')}>
              Non lues <span className="n">{nbNonLues}</span>
            </button>
          </div>
        </>
      )}

      {loading ? (
        <div className="ms-list">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ms-skel" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : erreur ? (
        <div className="ms-empty">
          <span className="emoji">⚠️</span>
          <h3>Oups, un problème est survenu</h3>
          <p>{erreur}</p>
          <button className="ms-btn" onClick={() => charger()}>
            Réessayer
          </button>
        </div>
      ) : convs.length === 0 ? (
        <div className="ms-empty">
          <span className="emoji">💌</span>
          <h3>Aucune conversation</h3>
          <p>Ouvrez une annonce et cliquez sur « Envoyer un message » pour discuter avec un vendeur ou un acheteur.</p>
          <button className="ms-btn" onClick={() => navigate('/')}>
            Voir les annonces
          </button>
        </div>
      ) : visibles.length === 0 ? (
        <div className="ms-empty" key={`${filtre}-${terme}`}>
          <span className="emoji">{filtre === 'nonlues' && !terme ? '🎉' : '🔎'}</span>
          <h3>{filtre === 'nonlues' && !terme ? 'Tout est lu !' : 'Aucun résultat'}</h3>
          <p style={{ marginBottom: 0 }}>{filtre === 'nonlues' && !terme ? 'Vous n\'avez aucun message non lu.' : 'Essayez avec un autre nom ou un autre mot.'}</p>
        </div>
      ) : (
        <div className="ms-list" key={`${filtre}-${terme ? 'q' : 'all'}`}>
          {visibles.map((c, i) => {
            const contact = c.contact;
            const m = c.dernierMessage;
            const moi = m.expediteur?._id === user?._id;
            const photo = contact.photo && !sansPhoto.has(contact._id) ? imageUrl(contact.photo) : null;
            const nomComplet = `${contact.prenom || ''} ${contact.nom || ''}`.trim() || 'Utilisateur';
            const annonce = m.annonce;
            const imgAnnonce = annonce?.images?.[0];

            return (
              <article
                key={contact._id}
                className={`ms-item ${c.nonLus > 0 ? 'unread' : ''} ${frais.has(contact._id) ? 'fresh' : ''}`}
                style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}
                onClick={() => ouvrir(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') ouvrir(c);
                }}
                tabIndex={0}
                role="link"
                aria-label={`Conversation avec ${nomComplet}`}
              >
                {photo ? (
                  <img
                    className="ms-avatar"
                    src={photo}
                    alt=""
                    onError={() => setSansPhoto((s) => new Set(s).add(contact._id))}
                  />
                ) : (
                  <div className="ms-avatar" style={{ background: couleurDe(contact._id) }}>
                    {initiales(contact)}
                  </div>
                )}

                <div className="ms-body">
                  <div className="ms-row">
                    <h3 className="ms-name">{nomComplet}</h3>
                    <span className="ms-time">{heureCourte(m.createdAt)}</span>
                  </div>
                  <div className="ms-row">
                    <p className="ms-preview">
                      {moi && <span className="ms-you">Vous : </span>}
                      {texteApercu(m)}
                    </p>
                    {c.nonLus > 0 && <span className="ms-badge">{c.nonLus > 99 ? '99+' : c.nonLus}</span>}
                  </div>
                  {annonce?.titre && (
                    <div className="ms-ad">
                      {imgAnnonce ? <img src={imageUrl(imgAnnonce)} alt="" /> : <div className="ph">🛍️</div>}
                      <span>{annonce.titre}</span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Messages;