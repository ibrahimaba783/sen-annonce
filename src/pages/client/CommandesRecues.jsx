import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import { useAuth } from '../../context/AuthContext';
import './CommandesRecues.css';

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

const STATUTS = {
  en_attente: { label: 'En attente', cls: 'pending' },
  acceptee: { label: 'Acceptée', cls: 'accepted' },
  en_cours_livraison: { label: 'En livraison', cls: 'shipping' },
  livree: { label: 'Livrée', cls: 'done' },
  refusee: { label: 'Refusée', cls: 'refused' },
  annulee: { label: 'Annulée', cls: 'cancelled' },
};

const ETAPES = ['Reçue', 'Acceptée', 'En livraison', 'Livrée'];
const ETAPE_INDEX = { en_attente: 0, acceptee: 1, en_cours_livraison: 2, livree: 3 };

const FILTRES = [
  { cle: 'toutes', label: 'Toutes', test: () => true },
  { cle: 'attente', label: 'En attente', test: (c) => c.statut === 'en_attente' },
  { cle: 'cours', label: 'En cours', test: (c) => ['acceptee', 'en_cours_livraison'].includes(c.statut) },
  { cle: 'livrees', label: 'Livrées', test: (c) => c.statut === 'livree' },
  { cle: 'refusees', label: 'Refusées', test: (c) => ['refusee', 'annulee'].includes(c.statut) },
];

const MOTIFS = ['Article indisponible', 'Livraison impossible dans cette zone', 'Informations de livraison incomplètes'];

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

const CommandesRecues = () => {
  const { isVendeur } = useAuth();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [filtre, setFiltre] = useState('toutes');
  const [busyId, setBusyId] = useState(null);
  const [dialog, setDialog] = useState(null); // { type: 'refus' | 'livree', id, motif }
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((text, type = 'ok') => {
    setToast({ text, type });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const charger = useCallback(async (silencieux = false) => {
    try {
      const { data } = await api.get('/orders/vendeur');
      setCommandes(Array.isArray(data) ? data : []);
      setErreur('');
    } catch (err) {
      if (!silencieux) setErreur(err.response?.data?.message || 'Impossible de charger les commandes');
    } finally {
      if (!silencieux) setLoading(false);
    }
  }, []);

  // Chargement puis actualisation automatique toutes les 15 secondes
  useEffect(() => {
    if (!isVendeur) {
      setLoading(false);
      return undefined;
    }
    charger();
    const t = setInterval(() => charger(true), 15000);
    return () => clearInterval(t);
  }, [isVendeur, charger]);

  const changerStatut = async (id, statut, motifRefus, message) => {
    setBusyId(id);
    try {
      const { data } = await api.patch(`/orders/${id}/statut`, { statut, motifRefus });
      setCommandes((liste) => liste.map((c) => (c._id === id ? { ...c, statut: data.statut, motifRefus: data.motifRefus } : c)));
      setDialog(null);
      showToast(message);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la mise à jour', 'err');
    } finally {
      setBusyId(null);
    }
  };

  if (!isVendeur) {
    return (
      <div className="co-root">
        <div className="co-empty">
          <span className="emoji">🔒</span>
          <h3>Page réservée aux vendeurs</h3>
          <p>Connectez-vous avec un compte vendeur pour voir les commandes reçues.</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: commandes.length,
    attente: commandes.filter((c) => c.statut === 'en_attente').length,
    cours: commandes.filter((c) => ['acceptee', 'en_cours_livraison'].includes(c.statut)).length,
    ca: commandes.filter((c) => c.statut === 'livree').reduce((s, c) => s + (c.total || 0), 0),
  };

  const filtreActif = FILTRES.find((f) => f.cle === filtre) || FILTRES[0];
  const visibles = commandes.filter(filtreActif.test);

  const renderSteps = (c) => {
    const cur = ETAPE_INDEX[c.statut];
    if (cur === undefined) return null;
    return (
      <div className="co-steps">
        {ETAPES.map((nom, i) => {
          const classes = ['co-step'];
          if (i < cur) classes.push('done', 'filled');
          if (i === cur) classes.push('current');
          if (i === cur && c.statut === 'livree') classes.push('final');
          return (
            <div key={nom} className={classes.join(' ')}>
              <span className="co-dot">{i < cur || c.statut === 'livree' ? '✓' : i + 1}</span>
              {nom}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="co-root">
      {toast && <div className={`co-toast ${toast.type}`}>{toast.text}</div>}

      <div className="co-head">
        <h1>
          Commandes reçues <span className="co-live">En direct</span>
        </h1>
        <p>Acceptez, préparez et livrez les commandes de vos clients.</p>
      </div>

      {!loading && !erreur && (
        <div className="co-stats">
          <div className="co-stat">
            <div className="co-stat-ico">📦</div>
            <div>
              <b><Compteur valeur={stats.total} /></b>
              <span className="l">Commandes</span>
            </div>
          </div>
          <div className="co-stat">
            <div className="co-stat-ico">⏳</div>
            <div>
              <b><Compteur valeur={stats.attente} /></b>
              <span className="l">À traiter</span>
            </div>
          </div>
          <div className="co-stat">
            <div className="co-stat-ico">🚚</div>
            <div>
              <b><Compteur valeur={stats.cours} /></b>
              <span className="l">En cours</span>
            </div>
          </div>
          <div className="co-stat">
            <div className="co-stat-ico">💰</div>
            <div>
              <b>
                <Compteur valeur={stats.ca} /> <small>FCFA</small>
              </b>
              <span className="l">Livré à ce jour</span>
            </div>
          </div>
        </div>
      )}

      <div className="co-filters">
        {FILTRES.map((f) => (
          <button key={f.cle} className={`co-pill ${filtre === f.cle ? 'on' : ''}`} onClick={() => setFiltre(f.cle)}>
            {f.label}
            <span className="n">{commandes.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="co-list">
          {[0, 1].map((i) => (
            <div key={i} className="co-skel" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : erreur ? (
        <div className="co-empty">
          <span className="emoji">⚠️</span>
          <h3>Oups, un problème est survenu</h3>
          <p style={{ marginBottom: 16 }}>{erreur}</p>
          <button className="co-btn accept" style={{ display: 'inline-flex' }} onClick={() => charger()}>
            Réessayer
          </button>
        </div>
      ) : visibles.length === 0 ? (
        <div className="co-empty" key={filtre}>
          <span className="emoji">{commandes.length === 0 ? '📭' : '🔎'}</span>
          <h3>{commandes.length === 0 ? "Vous n'avez pas encore reçu de commande" : 'Aucune commande dans cette catégorie'}</h3>
          <p>
            {commandes.length === 0
              ? 'Les commandes de vos clients apparaîtront ici automatiquement.'
              : 'Essayez un autre filtre pour voir vos commandes.'}
          </p>
        </div>
      ) : (
        <div className="co-list" key={filtre}>
          {visibles.map((c, i) => {
            const s = STATUTS[c.statut] || STATUTS.en_attente;
            const client = c.client || {};
            return (
              <article
                key={c._id}
                className={`co-card ${c.statut === 'en_attente' ? 'pending' : ''}`}
                style={{ animationDelay: `${Math.min(i, 6) * 80}ms` }}
              >
                <div className="co-top">
                  <div>
                    <div className="co-id">Commande #{c._id.slice(-6).toUpperCase()}</div>
                    <div className="co-date">🕒 {tempsRelatif(c.createdAt)}</div>
                  </div>
                  <span className={`co-badge ${s.cls}`}>{s.label}</span>
                </div>

                {renderSteps(c)}

                {(c.statut === 'refusee' || c.statut === 'annulee') && (
                  <div className="co-refused">
                    <span>⛔</span>
                    <span>
                      {c.statut === 'annulee' ? 'Commande annulée.' : 'Commande refusée.'}
                      {c.motifRefus ? ` Motif : ${c.motifRefus}` : ''}
                    </span>
                  </div>
                )}

                <div className="co-body">
                  <div className="co-box">
                    <h4>Client et livraison</h4>
                    <div className="co-client">
                      {client.photo ? (
                        <img className="co-avatar" src={imageUrl(client.photo)} alt="" />
                      ) : (
                        <div className="co-avatar">{initiales(client)}</div>
                      )}
                      <div>
                        <b>
                          {client.prenom} {client.nom}
                        </b>
                        <span>📞 {c.telephone}</span>
                      </div>
                    </div>
                    <div className="co-line">
                      <span>📍</span>
                      <span>
                        {c.adresseLivraison}, {c.villeLivraison}
                      </span>
                    </div>
                    {c.noteVendeur && (
                      <div className="co-line">
                        <span>📝</span>
                        <span>{c.noteVendeur}</span>
                      </div>
                    )}
                    <div className="co-line">
                      <span>💵</span>
                      <span>{c.modePaiement}</span>
                    </div>
                    <div className="co-contact">
                      <a className="co-btn soft" href={`tel:${c.telephone}`}>
                        📞 Appeler
                      </a>
                      {client._id && (
                        <Link className="co-btn soft" to={`/conversation/${client._id}`}>
                          💬 Message
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="co-box">
                    <h4>Articles commandés</h4>
                    {c.articles.map((a, idx) => (
                      <div key={idx} className="co-item">
                        {a.image ? <img src={imageUrl(a.image)} alt={a.titre} /> : <div className="ph">🛍️</div>}
                        <div className="t">
                          <b>{a.titre}</b>
                          <span>
                            {a.quantite} × {fcfa(a.prix)}
                          </span>
                        </div>
                        <div className="p">{fcfa(a.prix * a.quantite)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="co-foot">
                  <div className="co-total">
                    <small>Total de la commande</small>
                    <b>{fcfa(c.total)}</b>
                  </div>
                  <div className="co-actions">
                    {c.statut === 'en_attente' && (
                      <>
                        <button className="co-btn refuse" disabled={busyId === c._id} onClick={() => setDialog({ type: 'refus', id: c._id, motif: '' })}>
                          ✖ Refuser
                        </button>
                        <button className="co-btn accept" disabled={busyId === c._id} onClick={() => changerStatut(c._id, 'acceptee', undefined, 'Commande acceptée ✓ Le client est prévenu')}>
                          ✔ Accepter
                        </button>
                      </>
                    )}
                    {c.statut === 'acceptee' && (
                      <button className="co-btn ship" disabled={busyId === c._id} onClick={() => changerStatut(c._id, 'en_cours_livraison', undefined, 'Commande en livraison 🚚')}>
                        🚚 Mettre en livraison
                      </button>
                    )}
                    {c.statut === 'en_cours_livraison' && (
                      <button className="co-btn accept" disabled={busyId === c._id} onClick={() => setDialog({ type: 'livree', id: c._id })}>
                        🎉 Marquer comme livrée
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {dialog && (
        <div className="co-overlay" onClick={() => setDialog(null)}>
          <div className="co-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {dialog.type === 'refus' ? (
              <>
                <div className="emoji">✋</div>
                <h3>Refuser cette commande ?</h3>
                <p>Le client sera prévenu. Indiquez-lui la raison pour qu'il comprenne.</p>
                <textarea
                  placeholder="Motif du refus (facultatif)"
                  value={dialog.motif}
                  onChange={(e) => setDialog({ ...dialog, motif: e.target.value })}
                  autoFocus
                />
                <div className="co-reasons">
                  {MOTIFS.map((m) => (
                    <button key={m} type="button" className="co-reason" onClick={() => setDialog({ ...dialog, motif: m })}>
                      {m}
                    </button>
                  ))}
                </div>
                <div className="co-modal-actions">
                  <button className="co-btn gray" style={{ background: '#f1f5f9', color: '#475569' }} onClick={() => setDialog(null)}>
                    Annuler
                  </button>
                  <button
                    className="co-btn danger-solid"
                    disabled={busyId === dialog.id}
                    onClick={() => changerStatut(dialog.id, 'refusee', dialog.motif.trim() || 'Non précisé', 'Commande refusée. Le client est prévenu')}
                  >
                    Refuser la commande
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="emoji">🎉</div>
                <h3>Confirmer la livraison ?</h3>
                <p>
                  Le client sera prévenu que sa commande est livrée. Vos annonces restent visibles sur la page d'accueil.
                </p>
                <div className="co-modal-actions">
                  <button className="co-btn gray" style={{ background: '#f1f5f9', color: '#475569' }} onClick={() => setDialog(null)}>
                    Pas encore
                  </button>
                  <button className="co-btn accept" disabled={busyId === dialog.id} onClick={() => changerStatut(dialog.id, 'livree', undefined, 'Commande livrée 🎉')}>
                    Oui, livrée
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandesRecues;