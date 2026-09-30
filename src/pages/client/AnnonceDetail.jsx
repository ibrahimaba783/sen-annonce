import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import { useAuth } from '../../context/AuthContext';

const TROIS_JOURS = 3 * 24 * 3600 * 1000;
const DELAI_DIAPO = 4000;
const STATUTS = { validee: 'Validée', en_attente: 'En attente', refusee: 'Refusée' };

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const initiales = (u) => {
  const p = (u?.prenom || '').trim()[0] || '';
  const n = (u?.nom || '').trim()[0] || '';
  return (p + n).toUpperCase() || '?';
};

const AnnonceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isClient, fetchCartCount } = useAuth();

  const [annonce, setAnnonce] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isFavori, setIsFavori] = useState(false);
  const [signale, setSignale] = useState(false);
  const [quantite, setQuantite] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [toast, setToast] = useState(null);
  const [lightbox, setLightbox] = useState(false);

  const images = (annonce?.images || []).filter(Boolean);

  const showToast = useCallback((text, type = 'ok') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Chargement de l'annonce
  useEffect(() => {
    let annule = false;
    setAnnonce(null);
    setErreur(false);
    setIndex(0);
    setQuantite(1);
    setMsg(null);
    api
      .get(`/annonces/${id}`)
      .then((res) => {
        if (!annule) setAnnonce(res.data);
      })
      .catch(() => {
        if (!annule) setErreur(true);
      });
    return () => {
      annule = true;
    };
  }, [id]);

  // Comptage d'une vue : une seule fois par annonce et par session
  // (le propriétaire de l'annonce n'est jamais compté, c'est le backend qui vérifie)
  useEffect(() => {
    const cle = `vue_${id}`;
    try {
      if (sessionStorage.getItem(cle)) return;
      sessionStorage.setItem(cle, '1');
    } catch (e) {
      // stockage indisponible : on compte quand même
    }
    api
      .post(`/annonces/${id}/vue`)
      .then((res) => {
        if (typeof res.data?.vues === 'number') {
          setAnnonce((a) => (a ? { ...a, vues: res.data.vues } : a));
        }
      })
      .catch(() => {});
  }, [id]);

  // Diaporama automatique : passe à la photo suivante, en pause au survol ou en plein écran
  useEffect(() => {
    if (images.length < 2 || paused || lightbox) return undefined;

    let reduit = false;
    try {
      reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      reduit = false;
    }
    if (reduit) return undefined;

    const t = setTimeout(() => setIndex((i) => (i + 1) % images.length), DELAI_DIAPO);
    return () => clearTimeout(t);
  }, [index, images.length, paused, lightbox]);

  // Favori de l'utilisateur connecté
  useEffect(() => {
    if (!user) {
      setIsFavori(false);
      return;
    }
    api
      .get('/annonces/utilisateur/favoris')
      .then((res) => {
        if (Array.isArray(res.data)) setIsFavori(res.data.some((f) => f._id === id));
      })
      .catch(() => {});
  }, [id, user]);

  // Clavier en plein écran
  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, images.length]);

  const suivant = () => setIndex((i) => (i + 1) % images.length);
  const precedent = () => setIndex((i) => (i - 1 + images.length) % images.length);

  const envoyerMessage = () => {
    if (!user) return navigate('/connexion');
    navigate(`/conversation/${annonce.utilisateur._id}?annonce=${annonce._id}`);
  };

  const ajouterAuPanier = async (allerAuPaiement) => {
    if (!user) return navigate('/connexion');
    setBusy(true);
    setMsg(null);
    try {
      await api.post('/cart/add', { annonceId: annonce._id, quantite });
      await fetchCartCount();
      if (allerAuPaiement) {
        navigate('/commander');
      } else {
        setMsg({ type: 'ok', text: 'Ajouté au panier ✓' });
      }
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.message || "Erreur lors de l'ajout au panier" });
    } finally {
      setBusy(false);
    }
  };

  const toggleFavori = async () => {
    if (!user) return navigate('/connexion');
    try {
      const { data } = await api.post(`/annonces/${id}/favori`);
      const estFavori = data.estFavori !== undefined ? data.estFavori : !isFavori;
      setIsFavori(estFavori);
      showToast(estFavori ? 'Ajouté à vos favoris ❤️' : 'Retiré de vos favoris');
    } catch (err) {
      showToast('Impossible de modifier les favoris', 'err');
    }
  };

  const partager = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: annonce.titre, url: window.location.href });
      } catch (e) {
        // partage annulé
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Lien copié dans le presse-papier 🔗');
    } catch (e) {
      showToast('Impossible de copier le lien', 'err');
    }
  };

  const signaler = async () => {
    if (!user) return navigate('/connexion');
    if (!window.confirm('Signaler cette annonce comme inappropriée ?')) return;
    try {
      await api.post(`/annonces/${id}/signaler`);
      setSignale(true);
      showToast('Annonce signalée. Merci pour votre vigilance.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors du signalement', 'err');
    }
  };

  const supprimerAnnonce = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette annonce ?')) return;
    try {
      await api.delete(`/annonces/${id}`);
      navigate('/mes-annonces');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la suppression', 'err');
    }
  };

  /* ---------- Erreur / chargement ---------- */
  if (erreur) {
    return (
      <div className="ad-root">
        <div className="ad-card ad-empty">
          <span className="emoji">🔍</span>
          <h3 style={{ fontSize: 18 }}>Annonce introuvable</h3>
          <p style={{ color: '#64748b', margin: '8px 0 18px' }}>Cette annonce n'existe plus ou a été supprimée.</p>
          <Link to="/" className="ad-btn ad-btn-primary" style={{ display: 'inline-flex' }}>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  if (!annonce) {
    return (
      <div className="ad-root">
        <div className="ad-layout">
          <div>
            <div className="ad-skel-block" style={{ aspectRatio: '4 / 3', borderRadius: 24 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="ad-skel-block" style={{ height: 190 }} />
            <div className="ad-skel-block" style={{ height: 150 }} />
            <div className="ad-skel-block" style={{ height: 110 }} />
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Données dérivées ---------- */
  const vendeur = annonce.utilisateur || {};
  const ownerId = vendeur._id || annonce.utilisateur;
  const isOwner = !!user && !!ownerId && user._id.toString() === ownerId.toString();
  const peutCommander = !isOwner && (!user || isClient);
  const disponible = annonce.actif !== false;
  const nouveau = annonce.createdAt && Date.now() - new Date(annonce.createdAt).getTime() < TROIS_JOURS;
  const vendeurNom = `${vendeur.prenom || ''} ${vendeur.nom || ''}`.trim() || 'Vendeur';
  const anneeMembre = new Date(vendeur.createdAt || annonce.createdAt).getFullYear();

  return (
    <div className="ad-root">
      {toast && <div className={`ad-toast ${toast.type}`}>{toast.text}</div>}

      {/* Barre du haut */}
      <div className="ad-top">
        <button className="ad-circle" onClick={() => navigate(-1)} aria-label="Retour">
          ←
        </button>

        <nav className="ad-crumbs" aria-label="Fil d'Ariane">
          <Link to="/">Accueil</Link>
          <span>›</span>
          {annonce.categorie?.nom && (
            <>
              <span>{annonce.categorie.nom}</span>
              <span>›</span>
            </>
          )}
          <strong>{annonce.titre}</strong>
        </nav>

        <div className="ad-top-actions">
          <button
            className={`ad-circle ${isFavori ? 'fav-on' : ''}`}
            onClick={toggleFavori}
            aria-label={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <span key={String(isFavori)} className="ad-heart">
              {isFavori ? '❤️' : '♡'}
            </span>
          </button>
          <button className="ad-circle" onClick={partager} aria-label="Partager">
            ⤤
          </button>
          {!isOwner && (
            <button
              className={`ad-circle ${signale ? 'flag-on' : ''}`}
              onClick={signaler}
              disabled={signale}
              aria-label="Signaler"
              title="Signaler"
            >
              {signale ? '✅' : '🚩'}
            </button>
          )}
        </div>
      </div>

      <div className="ad-layout">
        {/* Colonne gauche : galerie */}
        <div className="ad-left">
          <div
            className="ad-main"
            onClick={() => images.length > 0 && setLightbox(true)}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {images.length > 0 ? (
              images.map((img, i) => (
                <div key={i} className={`ad-slide ${i === index ? 'on' : ''}`}>
                  <img className="ad-bg" src={imageUrl(img)} alt="" aria-hidden="true" />
                  <img className="ad-img" src={imageUrl(img)} alt={i === index ? annonce.titre : ''} />
                </div>
              ))
            ) : (
              <div className="ad-noimg">🛍️</div>
            )}

            {nouveau && <span className="ad-tag-new">Nouveau</span>}

            {images.length > 1 && (
              <>
                <button
                  className="ad-nav prev"
                  aria-label="Photo précédente"
                  onClick={(e) => {
                    e.stopPropagation();
                    precedent();
                  }}
                >
                  ‹
                </button>
                <button
                  className="ad-nav next"
                  aria-label="Photo suivante"
                  onClick={(e) => {
                    e.stopPropagation();
                    suivant();
                  }}
                >
                  ›
                </button>
                <span className="ad-counter">
                  {index + 1} / {images.length}
                </span>
              </>
            )}

            {images.length > 0 && <span className="ad-zoom-hint">🔍 Agrandir</span>}

            {images.length > 1 && !paused && !lightbox && (
              <span key={index} className="ad-progress" style={{ animationDuration: `${DELAI_DIAPO}ms` }} />
            )}
          </div>

          {images.length > 1 && (
            <div className="ad-thumbs">
              {images.map((img, i) => (
                <button
                  key={i}
                  className={`ad-thumb ${i === index ? 'on' : ''}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Voir la photo ${i + 1}`}
                >
                  <img src={imageUrl(img)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite : infos */}
        <div className="ad-right">
          {/* Titre, prix, infos */}
          <section className="ad-card">
            <div className="ad-chips">
              {annonce.categorie?.nom && <span className="ad-chip">{annonce.categorie.nom}</span>}
              {disponible ? (
                <span className="ad-chip ok">● Disponible</span>
              ) : (
                <span className="ad-chip off">Indisponible</span>
              )}
            </div>
            <h1 className="ad-title">{annonce.titre}</h1>
            <div className="ad-price">
              {annonce.prix?.toLocaleString('fr-FR')} <small>FCFA</small>
            </div>
            <div className="ad-facts">
              <span className="ad-fact">📍 {annonce.ville}</span>
              <span className="ad-fact">🗓️ {formatDate(annonce.createdAt)}</span>
              <span className="ad-fact">
                👁️ {annonce.vues || 0} vue{(annonce.vues || 0) > 1 ? 's' : ''}
              </span>
            </div>
          </section>

          {/* Commande (clients et visiteurs) */}
          {peutCommander && (
            <section className="ad-card">
              <h3>Commander cet article</h3>
              {!disponible ? (
                <p className="ad-unavailable">Cette annonce n'est plus disponible.</p>
              ) : (
                <>
                  <div className="ad-qty-row">
                    <span>Quantité</span>
                    <div className="ad-stepper">
                      <button onClick={() => setQuantite((q) => Math.max(1, q - 1))} aria-label="Diminuer">
                        −
                      </button>
                      <span>{quantite}</span>
                      <button onClick={() => setQuantite((q) => Math.min(99, q + 1))} aria-label="Augmenter">
                        +
                      </button>
                    </div>
                  </div>

                  <div className="ad-total">
                    <span>Total</span>
                    <strong>{(annonce.prix * quantite).toLocaleString('fr-FR')} FCFA</strong>
                  </div>

                  <div className="ad-btn-row">
                    <button className="ad-btn ad-btn-soft" onClick={() => ajouterAuPanier(false)} disabled={busy}>
                      🛒 Ajouter au panier
                    </button>
                    <button className="ad-btn ad-btn-primary" onClick={() => ajouterAuPanier(true)} disabled={busy}>
                      ⚡ Commander maintenant
                    </button>
                  </div>

                  {msg && (
                    <div className={`ad-msg ${msg.type}`}>
                      <span>{msg.text}</span>
                      {msg.type === 'ok' && <button onClick={() => navigate('/panier')}>Voir le panier</button>}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* Propriétaire */}
          {isOwner && (
            <section className="ad-card">
              <h3>Votre annonce</h3>
              <div className="ad-owner-stats">
                <div className="ad-stat">
                  <b>{annonce.vues || 0}</b>
                  <span>Vues</span>
                </div>
                <div className="ad-stat">
                  <b>{STATUTS[annonce.statut] || annonce.statut}</b>
                  <span>Statut</span>
                </div>
              </div>
              <div className="ad-btn-row">
                <button className="ad-btn ad-btn-soft" onClick={() => navigate(`/annonce/modifier/${annonce._id}`)}>
                  ✏️ Modifier
                </button>
                <button className="ad-btn ad-btn-danger" onClick={supprimerAnnonce}>
                  🗑️ Supprimer
                </button>
              </div>
            </section>
          )}

          {/* Description */}
          <section className="ad-card">
            <h3>Description</h3>
            <p className="ad-desc">{annonce.description}</p>
          </section>

          {/* Vendeur */}
          <section className="ad-card">
            <h3>Vendeur</h3>
            <div className="ad-seller">
              {vendeur.photo ? (
                <img className="ad-avatar" src={imageUrl(vendeur.photo)} alt={vendeurNom} />
              ) : (
                <div className="ad-avatar ad-avatar-fallback">{initiales(vendeur)}</div>
              )}
              <div style={{ minWidth: 0 }}>
                <div className="ad-seller-name">
                  <span>{vendeurNom}</span>
                  {vendeur.isVerified && <span className="ad-verified">✓ Vérifié</span>}
                </div>
                <div className="ad-seller-sub">Membre depuis {anneeMembre}</div>
              </div>
            </div>

            {!isOwner && (
              <div className="ad-seller-actions ad-hide-mobile">
                <div className="ad-btn-row">
                  {vendeur.telephone && (
                    <a className="ad-btn ad-btn-soft" href={`tel:${vendeur.telephone}`}>
                      📞 Appeler
                    </a>
                  )}
                  <button className="ad-btn ad-btn-primary" onClick={envoyerMessage}>
                    💬 Envoyer un message
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Barre d'actions mobile (visiteurs, clients et autres vendeurs) */}
      {!isOwner && (
        <div className="ad-mobile-bar">
          {vendeur.telephone && (
            <a className="ad-btn ad-btn-soft" href={`tel:${vendeur.telephone}`}>
              📞 Appeler
            </a>
          )}
          <button className="ad-btn ad-btn-primary" onClick={envoyerMessage}>
            💬 Envoyer un message
          </button>
        </div>
      )}

      {/* Plein écran */}
      {lightbox && images.length > 0 && (
        <div className="ad-lightbox" onClick={() => setLightbox(false)}>
          <button className="ad-lb-btn ad-lb-close" aria-label="Fermer" onClick={() => setLightbox(false)}>
            ✕
          </button>
          {images.length > 1 && (
            <>
              <button
                className="ad-lb-btn ad-lb-prev"
                aria-label="Photo précédente"
                onClick={(e) => {
                  e.stopPropagation();
                  precedent();
                }}
              >
                ‹
              </button>
              <button
                className="ad-lb-btn ad-lb-next"
                aria-label="Photo suivante"
                onClick={(e) => {
                  e.stopPropagation();
                  suivant();
                }}
              >
                ›
              </button>
              <div className="ad-lb-count">
                {index + 1} / {images.length}
              </div>
            </>
          )}
          <img
            key={index}
            src={imageUrl(images[index])}
            alt={annonce.titre}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default AnnonceDetail;