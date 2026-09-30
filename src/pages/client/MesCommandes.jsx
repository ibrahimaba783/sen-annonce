import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import './MesCommandes.css';

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

const STATUTS = {
  en_attente: { label: 'En attente', cls: 'pending' },
  acceptee: { label: 'Acceptée', cls: 'accepted' },
  en_cours_livraison: { label: 'En livraison', cls: 'shipping' },
  livree: { label: 'Livrée', cls: 'done' },
  refusee: { label: 'Refusée', cls: 'refused' },
  annulee: { label: 'Annulée', cls: 'cancelled' },
};

const ETAPES = ['Envoyée', 'Acceptée', 'En livraison', 'Livrée'];
const ETAPE_INDEX = { en_attente: 0, acceptee: 1, en_cours_livraison: 2, livree: 3 };

const INDICES = {
  en_attente: { icone: '⏳', texte: "Le vendeur n'a pas encore répondu à votre commande." },
  acceptee: { icone: '👍', texte: 'Le vendeur a accepté votre commande et la prépare.' },
  en_cours_livraison: { icone: '🚚', texte: 'Votre commande est en route vers vous.' },
  livree: { icone: '🎉', texte: 'Commande livrée. Merci pour votre achat !' },
};

const FILTRES = [
  { cle: 'toutes', label: 'Toutes', test: () => true },
  { cle: 'cours', label: 'En cours', test: (c) => ['en_attente', 'acceptee', 'en_cours_livraison'].includes(c.statut) },
  { cle: 'livrees', label: 'Livrées', test: (c) => c.statut === 'livree' },
  { cle: 'refusees', label: 'Refusées', test: (c) => ['refusee', 'annulee'].includes(c.statut) },
];

const tempsRelatif = (date) => {
  const min = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.floor(min / 60)} h`;
  if (min < 10080) return `il y a ${Math.floor(min / 1440)} j`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const initiales = (u) => `${(u?.prenom || '').trim()[0] || ''}${(u?.nom || '').trim()[0] || ''}`.toUpperCase() || '?';

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

const MesCommandes = () => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [filtre, setFiltre] = useState('toutes');
  const [changees, setChangees] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const statutsVus = useRef(null); // id de commande -> dernier statut connu

  const showToast = useCallback((text) => {
    setToast(text);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const charger = useCallback(
    async (silencieux = false) => {
      try {
        const { data } = await api.get('/orders/client');
        const liste = Array.isArray(data) ? data : [];

        // Repère les commandes dont le statut vient de changer
        if (statutsVus.current) {
          const modifiees = liste.filter((c) => statutsVus.current.has(c._id) && statutsVus.current.get(c._id) !== c.statut);
          if (modifiees.length > 0) {
            setChangees(new Set(modifiees.map((c) => c._id)));
            const c = modifiees[0];
            const nom = STATUTS[c.statut]?.label || c.statut;
            showToast(
              modifiees.length === 1
                ? `📦 Commande #${c._id.slice(-6).toUpperCase()} : ${nom}`
                : `📦 ${modifiees.length} commandes ont changé de statut`
            );
          }
        }
        statutsVus.current = new Map(liste.map((c) => [c._id, c.statut]));

        setCommandes(liste);
        setErreur('');
      } catch (err) {
        if (!silencieux) setErreur(err.response?.data?.message || 'Impossible de charger vos commandes');
      } finally {
        if (!silencieux) setLoading(false);
      }
    },
    [showToast]
  );

  // Chargement puis actualisation automatique toutes les 15 secondes
  useEffect(() => {
    charger();
    const t = setInterval(() => charger(true), 15000);
    return () => clearInterval(t);
  }, [charger]);

  const stats = {
    total: commandes.length,
    cours: commandes.filter(FILTRES[1].test).length,
    livrees: commandes.filter((c) => c.statut === 'livree').length,
    depense: commandes.filter((c) => c.statut === 'livree').reduce((s, c) => s + (c.total || 0), 0),
  };

  const filtreActif = FILTRES.find((f) => f.cle === filtre) || FILTRES[0];
  const visibles = commandes.filter(filtreActif.test);

  const renderSteps = (c) => {
    const cur = ETAPE_INDEX[c.statut];
    if (cur === undefined) return null;
    return (
      <div className="mc-steps">
        {ETAPES.map((nom, i) => {
          const classes = ['mc-step'];
          if (i < cur) classes.push('done', 'filled');
          if (i === cur) classes.push('current');
          if (i === cur && c.statut === 'livree') classes.push('final');
          return (
            <div key={nom} className={classes.join(' ')}>
              <span className="mc-dot">{i < cur || c.statut === 'livree' ? '✓' : i + 1}</span>
              {nom}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mc-root">
      {toast && <div className="mc-toast">{toast}</div>}

      <div className="mc-head">
        <h1>
          Mes commandes <span className="mc-live">Suivi en direct</span>
        </h1>
        <p>Suivez chacun de vos achats, de l'envoi jusqu'à la livraison.</p>
      </div>

      {!loading && !erreur && (
        <div className="mc-stats">
          <div className="mc-stat">
            <div className="mc-stat-ico">📦</div>
            <div>
              <b><Compteur valeur={stats.total} /></b>
              <span className="l">Commandes</span>
            </div>
          </div>
          <div className="mc-stat">
            <div className="mc-stat-ico">🚚</div>
            <div>
              <b><Compteur valeur={stats.cours} /></b>
              <span className="l">En cours</span>
            </div>
          </div>
          <div className="mc-stat">
            <div className="mc-stat-ico">✅</div>
            <div>
              <b><Compteur valeur={stats.livrees} /></b>
              <span className="l">Livrées</span>
            </div>
          </div>
          <div className="mc-stat">
            <div className="mc-stat-ico">💰</div>
            <div>
              <b>
                <Compteur valeur={stats.depense} /> <small>FCFA</small>
              </b>
              <span className="l">Déjà reçu</span>
            </div>
          </div>
        </div>
      )}

      <div className="mc-filters">
        {FILTRES.map((f) => (
          <button key={f.cle} className={`mc-pill ${filtre === f.cle ? 'on' : ''}`} onClick={() => setFiltre(f.cle)}>
            {f.label}
            <span className="n">{commandes.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mc-list">
          {[0, 1].map((i) => (
            <div key={i} className="mc-skel" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : erreur ? (
        <div className="mc-empty">
          <span className="emoji">⚠️</span>
          <h3>Oups, un problème est survenu</h3>
          <p>{erreur}</p>
          <button className="mc-btn primary" style={{ display: 'inline-flex' }} onClick={() => charger()}>
            Réessayer
          </button>
        </div>
      ) : visibles.length === 0 ? (
        <div className="mc-empty" key={filtre}>
          <span className="emoji">{commandes.length === 0 ? '🛍️' : '🔎'}</span>
          <h3>{commandes.length === 0 ? "Vous n'avez pas encore passé de commande" : 'Aucune commande dans cette catégorie'}</h3>
          <p>{commandes.length === 0 ? 'Parcourez les annonces et commandez votre premier article.' : 'Essayez un autre filtre pour voir vos commandes.'}</p>
          {commandes.length === 0 && (
            <Link to="/" className="mc-btn primary" style={{ display: 'inline-flex' }}>
              Voir les annonces
            </Link>
          )}
        </div>
      ) : (
        <div className="mc-list" key={filtre}>
          {visibles.map((c, i) => {
            const s = STATUTS[c.statut] || STATUTS.en_attente;
            const vendeur = c.vendeur || {};
            const indice = INDICES[c.statut];
            const premierArticle = c.articles?.[0];
            const enCours = ['en_attente', 'acceptee', 'en_cours_livraison'].includes(c.statut);

            return (
              <article
                key={c._id}
                className={`mc-card ${enCours ? 'moving' : ''} ${changees.has(c._id) ? 'changed' : ''}`}
                style={{ animationDelay: `${Math.min(i, 6) * 80}ms` }}
              >
                <div className="mc-top">
                  <div>
                    <div className="mc-id">Commande #{c._id.slice(-6).toUpperCase()}</div>
                    <div className="mc-date">🕒 {tempsRelatif(c.createdAt)}</div>
                  </div>
                  <span className={`mc-badge ${s.cls}`}>{s.label}</span>
                </div>

                {renderSteps(c)}

                {indice && (
                  <div className={`mc-hint ${c.statut === 'livree' ? 'done' : ''}`}>
                    <span>{indice.icone}</span>
                    <span>{indice.texte}</span>
                  </div>
                )}

                {(c.statut === 'refusee' || c.statut === 'annulee') && (
                  <div className="mc-refused">
                    <span>⛔</span>
                    <span>
                      {c.statut === 'annulee' ? 'Commande annulée.' : 'Le vendeur a refusé cette commande.'}
                      {c.motifRefus ? ` Motif : ${c.motifRefus}` : ''}
                    </span>
                  </div>
                )}

                <div className="mc-body">
                  <div className="mc-box">
                    <h4>Articles commandés</h4>
                    {c.articles.map((a, idx) => (
                      <Link key={idx} to={`/annonce/${a.annonce}`} className="mc-item">
                        {a.image ? <img src={imageUrl(a.image)} alt={a.titre} loading="lazy" /> : <div className="ph">🛍️</div>}
                        <div className="t">
                          <b>{a.titre}</b>
                          <span>
                            {a.quantite} × {fcfa(a.prix)}
                          </span>
                        </div>
                        <div className="p">{fcfa(a.prix * a.quantite)}</div>
                      </Link>
                    ))}
                  </div>

                  <div className="mc-box">
                    <h4>Livraison</h4>
                    <div className="mc-line">
                      <span>📍</span>
                      <span>
                        {c.adresseLivraison}, {c.villeLivraison}
                      </span>
                    </div>
                    <div className="mc-line">
                      <span>📞</span>
                      <span>{c.telephone}</span>
                    </div>
                    <div className="mc-line">
                      <span>💵</span>
                      <span>{c.modePaiement}</span>
                    </div>
                    {c.noteVendeur && (
                      <div className="mc-line">
                        <span>📝</span>
                        <span>{c.noteVendeur}</span>
                      </div>
                    )}

                    <div className="mc-seller">
                      {vendeur.photo ? <img className="mc-avatar" src={imageUrl(vendeur.photo)} alt="" /> : <div className="mc-avatar">{initiales(vendeur)}</div>}
                      <div>
                        <b>
                          {vendeur.prenom} {vendeur.nom}
                        </b>
                        <span>Vendeur</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mc-foot">
                  <div className="mc-total">
                    <small>Total de la commande</small>
                    <b>{fcfa(c.total)}</b>
                  </div>
                  <div className="mc-actions">
                    {vendeur.telephone && (
                      <a className="mc-btn soft" href={`tel:${vendeur.telephone}`}>
                        📞 Appeler
                      </a>
                    )}
                    {vendeur._id && (
                      <Link className="mc-btn soft" to={`/conversation/${vendeur._id}`}>
                        💬 Contacter le vendeur
                      </Link>
                    )}
                    {c.statut === 'livree' && premierArticle && (
                      <Link className="mc-btn primary" to={`/annonce/${premierArticle.annonce}`}>
                        🔁 Commander à nouveau
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MesCommandes;