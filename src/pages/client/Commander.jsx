
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import { useAuth } from '../../context/AuthContext';
import './Commander.css';

const VILLES = [
  'Dakar',
  'Pikine',
  'Guédiawaye',
  'Rufisque',
  'Thiès',
  'Mbour',
  'Saint-Louis',
  'Touba',
  'Kaolack',
  'Ziguinchor',
  'Diourbel',
  'Louga',
  'Tambacounda',
  'Kolda',
  'Fatick',
  'Kaffrine',
  'Matam',
  'Sédhiou',
  'Kédougou',
];

const MEMOIRE = 'commande_livraison';

const fcfa = (n) =>
  `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

// Dernière adresse de livraison utilisée
const lireMemoire = () => {
  try {
    return JSON.parse(localStorage.getItem(MEMOIRE) || 'null') || {};
  } catch {
    return {};
  }
};

const Commander = () => {
  const { user, fetchCartCount } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');
  const [essai, setEssai] = useState(0);

  const [form, setForm] = useState(() => {
    const m = lireMemoire();

    return {
      adresseLivraison: m.adresseLivraison || '',
      villeLivraison: m.villeLivraison || '',
      telephone: m.telephone || user?.telephone || '',
      noteVendeur: '',
    };
  });

  const [erreurs, setErreurs] = useState({});
  const [erreurGlobale, setErreurGlobale] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [succes, setSucces] = useState(null);
  const [toast, setToast] = useState(null);

  // ==============================
  // TOAST
  // ==============================
  const showToast = useCallback((text, type = 'ok') => {
    setToast({ text, type });

    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  // ==============================
  // TELEPHONE DU COMPTE
  // ==============================
  useEffect(() => {
    if (user?.telephone) {
      setForm((f) =>
        f.telephone
          ? f
          : {
              ...f,
              telephone: user.telephone,
            }
      );
    }
  }, [user?.telephone]);

  // ==============================
  // CHARGEMENT DU PANIER
  // ==============================
  useEffect(() => {
    let annule = false;

    setLoading(true);
    setErreurChargement('');

    api
      .get('/cart')
      .then((res) => {
        if (!annule) {
          setArticles(
            (res.data?.articles || []).filter((a) => a.annonce)
          );
        }
      })
      .catch((err) => {
        if (!annule) {
          setErreurChargement(
            err.response?.data?.message ||
              'Impossible de charger votre panier'
          );
        }
      })
      .finally(() => {
        if (!annule) {
          setLoading(false);
        }
      });

    return () => {
      annule = true;
    };
  }, [essai]);

  // ==============================
  // CALCULS
  // ==============================
  const total = useMemo(() => {
    return articles.reduce(
      (s, a) => s + Number(a.annonce?.prix || 0) * Number(a.quantite || 0),
      0
    );
  }, [articles]);

  const nbArticles = useMemo(() => {
    return articles.reduce(
      (s, a) => s + Number(a.quantite || 0),
      0
    );
  }, [articles]);

  const nbVendeurs = useMemo(() => {
    return new Set(
      articles.map((a) =>
        String(
          a.annonce?.utilisateur?._id ||
            a.annonce?.utilisateur ||
            ''
        )
      )
    ).size;
  }, [articles]);

  // ==============================
  // CHANGEMENT FORMULAIRE
  // ==============================
  const onChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === 'telephone') {
      value = value.replace(/[^\d+\s-]/g, '');
    }

    setForm((f) => ({
      ...f,
      [name]: value,
    }));

    if (erreurs[name]) {
      setErreurs((er) => ({
        ...er,
        [name]: undefined,
      }));
    }

    if (erreurGlobale) {
      setErreurGlobale('');
    }
  };

  // ==============================
  // PANIER
  // ==============================
  const appliquerPanier = (data) => {
    setArticles(
      (data?.articles || []).filter((a) => a.annonce)
    );
  };

  const changerQuantite = async (annonceId, quantite) => {
    if (quantite < 1 || quantite > 99) return;

    setBusyId(annonceId);

    try {
      const { data } = await api.put('/cart/update', {
        annonceId,
        quantite,
      });

      appliquerPanier(data);
      await fetchCartCount();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          'Impossible de modifier la quantité',
        'err'
      );
    } finally {
      setBusyId(null);
    }
  };

  const retirer = async (annonceId) => {
    setBusyId(annonceId);

    try {
      const { data } = await api.delete(
        `/cart/remove/${annonceId}`
      );

      appliquerPanier(data);
      await fetchCartCount();

      showToast('Article retiré du panier');
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Impossible de retirer l'article",
        'err'
      );
    } finally {
      setBusyId(null);
    }
  };

  // ==============================
  // VALIDATION
  // ==============================
  const valider = () => {
    const er = {};

    if (form.adresseLivraison.trim().length < 5) {
      er.adresseLivraison =
        'Indiquez une adresse précise (quartier, rue…)';
    }

    if (!form.villeLivraison.trim()) {
      er.villeLivraison = 'Indiquez votre ville';
    }

    const chiffres = form.telephone.replace(/\D/g, '');

    if (chiffres.length < 8 || chiffres.length > 15) {
      er.telephone =
        'Numéro de téléphone invalide (8 chiffres minimum)';
    }

    return er;
  };

  // ==============================
  // CONFIRMATION COMMANDE
  // ==============================
  const confirmer = async (e) => {
    e.preventDefault();

    if (envoi || articles.length === 0) return;

    const er = valider();

    setErreurs(er);

    const premier = Object.keys(er)[0];

    if (premier) {
      const cible = document.getElementById(`cm-${premier}`);

      if (cible) {
        cible.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        cible.focus({
          preventScroll: true,
        });
      }

      return;
    }

    setEnvoi(true);
    setErreurGlobale('');

    try {
      const { data } = await api.post('/orders', {
        articles: articles.map((a) => ({
          annonceId: a.annonce._id,
          quantite: a.quantite,
        })),

        adresseLivraison:
          form.adresseLivraison.trim(),

        villeLivraison:
          form.villeLivraison.trim(),

        telephone:
          form.telephone.trim(),

        noteVendeur:
          form.noteVendeur.trim(),

        modePaiement:
          'Paiement à la livraison',
      });

      // Sauvegarder les informations de livraison
      try {
        localStorage.setItem(
          MEMOIRE,
          JSON.stringify({
            adresseLivraison:
              form.adresseLivraison.trim(),

            villeLivraison:
              form.villeLivraison.trim(),

            telephone:
              form.telephone.trim(),
          })
        );
      } catch {
        // localStorage indisponible : pas bloquant
      }

      await fetchCartCount();

      setSucces({
        commandes: data.commandes || [],
      });

      showToast('Commande créée avec succès');

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Erreur lors de l'envoi de la commande";

      setErreurGlobale(message);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } finally {
      setEnvoi(false);
    }
  };

  // ==============================
  // CHARGEMENT
  // ==============================
  if (loading) {
    return (
      <div className="cm-root">
        <div
          className="cm-layout"
          style={{ marginTop: 20 }}
        >
          <div className="cm-form">
            <div
              className="cm-skel"
              style={{ height: 380 }}
            />

            <div
              className="cm-skel"
              style={{ height: 130 }}
            />
          </div>

          <div
            className="cm-skel"
            style={{ height: 420 }}
          />
        </div>
      </div>
    );
  }

  // ==============================
  // ERREUR CHARGEMENT
  // ==============================
  if (erreurChargement) {
    return (
      <div className="cm-root">
        <div className="cm-empty">
          <span className="emoji">⚠️</span>

          <h3>
            Oups, un problème est survenu
          </h3>

          <p>{erreurChargement}</p>

          <button
            type="button"
            className="cm-btn fit"
            onClick={() =>
              setEssai((n) => n + 1)
            }
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ==============================
  // SUCCÈS COMMANDE
  // ==============================
  if (succes) {
    return (
      <div className="cm-root">
        <div className="cm-empty cm-success">
          <span className="emoji">🎉</span>

          <h3>Commande confirmée !</h3>

          <p>
            Votre commande a été enregistrée avec
            succès.
          </p>

          {succes.commandes?.length > 0 && (
            <div
              className="cm-success-orders"
              style={{ marginTop: 20 }}
            >
              <strong>
                Commande
                {succes.commandes.length > 1
                  ? 's'
                  : ''}{' '}
                créée
                {succes.commandes.length > 1
                  ? 's'
                  : ''}
              </strong>

              {succes.commandes.map(
                (commande, index) => (
                  <div
                    key={
                      commande._id ||
                      commande.id ||
                      index
                    }
                    style={{
                      marginTop: 8,
                    }}
                  >
                    {commande.numero
                      ? `N° ${commande.numero}`
                      : `Commande ${index + 1}`}
                  </div>
                )
              )}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 25,
            }}
          >
            <Link
              to="/"
              className="cm-btn fit"
            >
              Voir les annonces
            </Link>

            <Link
              to="/mes-commandes"
              className="cm-btn fit"
            >
              Mes commandes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==============================
  // PANIER VIDE
  // ==============================
  if (articles.length === 0) {
    return (
      <div className="cm-root">
        <div className="cm-empty">
          <span className="emoji">🛒</span>

          <h3>
            Votre panier est vide
          </h3>

          <p>
            Il n'y a rien à commander pour le
            moment.
          </p>

          <Link
            to="/"
            className="cm-btn fit"
          >
            Voir les annonces
          </Link>
        </div>
      </div>
    );
  }

  // ==============================
  // BOUTON
  // ==============================
  const boutonConfirmer = envoi ? (
    <>
      <span className="cm-spin" />
      Envoi en cours…
    </>
  ) : (
    <>✅ Confirmer la commande</>
  );

  // ==============================
  // PAGE PRINCIPALE
  // ==============================
  return (
    <div className="cm-root">

      {toast && (
        <div
          className={`cm-toast ${toast.type}`}
        >
          {toast.text}
        </div>
      )}

      <div className="cm-head">
        <h1>
          Valider ma commande
        </h1>

        <p>
          Plus qu'une étape : indiquez où vous
          livrer.
        </p>
      </div>

      {/* ÉTAPES */}
      <div
        className="cm-steps"
        aria-label="Étapes de la commande"
      >
        <div className="cm-step done">
          <Link to="/panier">
            <span className="cm-dot">
              ✓
            </span>
            Panier
          </Link>
        </div>

        <div className="cm-step current">
          <span className="cm-dot">
            2
          </span>
          Livraison
        </div>

        <div className="cm-step">
          <span className="cm-dot">
            3
          </span>
          Confirmation
        </div>
      </div>

      <div className="cm-layout">

        {/* ==========================
            FORMULAIRE
        ========================== */}
        <form
          id="cm-form"
          className="cm-form"
          onSubmit={confirmer}
          noValidate
        >

          {erreurGlobale && (
            <div
              className="cm-alert"
              role="alert"
            >
              <span>⚠️</span>

              <span style={{ flex: 1 }}>
                {erreurGlobale}
              </span>

              <Link to="/panier">
                Voir le panier
              </Link>
            </div>
          )}

          {/* LIVRAISON */}
          <section className="cm-card">

            <div className="cm-card-head">
              <span className="cm-num">
                1
              </span>

              <div>
                <h2>
                  Adresse de livraison
                </h2>

                <p>
                  Le vendeur vous livrera à
                  cette adresse.
                </p>
              </div>
            </div>

            <div className="cm-grid">

              {/* ADRESSE */}
              <div
                className={`cm-field full ${
                  erreurs.adresseLivraison
                    ? 'err'
                    : ''
                }`}
              >
                <label htmlFor="cm-adresseLivraison">
                  Adresse *
                </label>

                <div className="cm-input">
                  <span className="ico">
                    📍
                  </span>

                  <input
                    id="cm-adresseLivraison"
                    name="adresseLivraison"
                    value={
                      form.adresseLivraison
                    }
                    onChange={onChange}
                    placeholder="Ex : Quartier Randoulène, rue 12"
                    autoComplete="street-address"
                  />
                </div>

                {erreurs.adresseLivraison && (
                  <span className="cm-error">
                    {
                      erreurs.adresseLivraison
                    }
                  </span>
                )}
              </div>

              {/* VILLE */}
              <div
                className={`cm-field ${
                  erreurs.villeLivraison
                    ? 'err'
                    : ''
                }`}
              >
                <label htmlFor="cm-villeLivraison">
                  Ville *
                </label>

                <div className="cm-input">
                  <span className="ico">
                    🏙️
                  </span>

                  <input
                    id="cm-villeLivraison"
                    name="villeLivraison"
                    list="cm-villes"
                    value={
                      form.villeLivraison
                    }
                    onChange={onChange}
                    placeholder="Ex : Thiès"
                    autoComplete="address-level2"
                  />

                  <datalist id="cm-villes">
                    {VILLES.map((v) => (
                      <option
                        key={v}
                        value={v}
                      />
                    ))}
                  </datalist>
                </div>

                {erreurs.villeLivraison && (
                  <span className="cm-error">
                    {
                      erreurs.villeLivraison
                    }
                  </span>
                )}
              </div>

              {/* TELEPHONE */}
              <div
                className={`cm-field ${
                  erreurs.telephone
                    ? 'err'
                    : ''
                }`}
              >
                <label htmlFor="cm-telephone">
                  Téléphone *
                </label>

                <div className="cm-input">
                  <span className="ico">
                    📞
                  </span>

                  <input
                    id="cm-telephone"
                    name="telephone"
                    type="tel"
                    inputMode="tel"
                    value={form.telephone}
                    onChange={onChange}
                    placeholder="77 000 00 00"
                    autoComplete="tel"
                  />
                </div>

                {erreurs.telephone ? (
                  <span className="cm-error">
                    {erreurs.telephone}
                  </span>
                ) : (
                  <span className="cm-hint">
                    Le vendeur vous appellera à ce
                    numéro.
                  </span>
                )}
              </div>

              {/* NOTE */}
              <div className="cm-field full">
                <label htmlFor="cm-noteVendeur">
                  Note pour le vendeur{' '}
                  <small>
                    facultatif ·{' '}
                    {form.noteVendeur.length}/300
                  </small>
                </label>

                <textarea
                  id="cm-noteVendeur"
                  name="noteVendeur"
                  className="cm-textarea"
                  value={form.noteVendeur}
                  onChange={onChange}
                  maxLength={300}
                  placeholder="Précisions sur la livraison : repère, horaire souhaité…"
                />
              </div>

            </div>
          </section>

          {/* PAIEMENT */}
          <section className="cm-card">

            <div className="cm-card-head">
              <span className="cm-num">
                2
              </span>

              <div>
                <h2>
                  Mode de paiement
                </h2>

                <p>
                  Aucun paiement en ligne pour le
                  moment.
                </p>
              </div>
            </div>

            <div className="cm-pay">

              <div className="cm-pay-ico">
                💵
              </div>

              <div>
                <b>
                  Paiement à la livraison
                </b>

                <span className="d">
                  Vous payez en espèces au vendeur,
                  à la réception de votre commande.
                </span>
              </div>

              <span className="cm-radio">
                ✓
              </span>

            </div>

          </section>

          {/* BOUTON DE CONFIRMATION */}
          <button
            type="submit"
            className="cm-btn cm-submit"
            disabled={
              envoi || articles.length === 0
            }
          >
            {boutonConfirmer}
          </button>

          <p className="cm-secure">
            🔒 Vos informations sont utilisées
            uniquement pour traiter votre commande.
          </p>

        </form>

        {/* ==========================
            RECAPITULATIF
        ========================== */}
        <aside className="cm-side">

          <div className="cm-sum">

            <div className="cm-sum-head">
              <h3>
                Récapitulatif · {nbArticles}{' '}
                article
                {nbArticles > 1 ? 's' : ''}
              </h3>

              <Link to="/panier">
                Modifier
              </Link>
            </div>

            <div className="cm-items">

              {articles.map(
                (
                  { annonce, quantite },
                  i
                ) => {
                  const image = (
                    annonce.images || []
                  ).find(Boolean);

                  const occupe =
                    busyId === annonce._id;

                  return (
                    <div
                      key={annonce._id}
                      className="cm-item"
                      style={{
                        animationDelay: `${
                          Math.min(i, 6) *
                          60
                        }ms`,
                      }}
                    >

                      {image ? (
                        <img
                          src={imageUrl(image)}
                          alt={
                            annonce.titre
                          }
                          loading="lazy"
                        />
                      ) : (
                        <div className="ph">
                          🛍️
                        </div>
                      )}

                      <div className="cm-item-t">

                        <Link
                          to={`/annonce/${annonce._id}`}
                        >
                          {annonce.titre}
                        </Link>

                        <div className="cm-item-u">
                          {fcfa(
                            annonce.prix
                          )}{' '}
                          l'unité
                        </div>

                        <div className="cm-item-row">

                          {/* QUANTITE */}
                          <div className="cm-qty">

                            <button
                              type="button"
                              onClick={() =>
                                changerQuantite(
                                  annonce._id,
                                  quantite - 1
                                )
                              }
                              disabled={
                                occupe ||
                                quantite <= 1
                              }
                              aria-label="Diminuer la quantité"
                            >
                              −
                            </button>

                            <span>
                              {quantite}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                changerQuantite(
                                  annonce._id,
                                  quantite + 1
                                )
                              }
                              disabled={
                                occupe ||
                                quantite >= 99
                              }
                              aria-label="Augmenter la quantité"
                            >
                              +
                            </button>

                          </div>

                          {/* TOTAL LIGNE */}
                          <span className="cm-line">
                            {fcfa(
                              Number(
                                annonce.prix
                              ) *
                                Number(
                                  quantite
                                )
                            )}
                          </span>

                          {/* SUPPRIMER */}
                          <button
                            type="button"
                            className="cm-rm"
                            onClick={() =>
                              retirer(
                                annonce._id
                              )
                            }
                            disabled={occupe}
                            aria-label="Retirer cet article"
                            title="Retirer"
                          >
                            🗑️
                          </button>

                        </div>
                      </div>
                    </div>
                  );
                }
              )}

            </div>

            {/* TOTALS */}
            <div className="cm-rows">

              <div className="cm-row">
                <span>
                  Sous-total
                </span>

                <span>
                  {fcfa(total)}
                </span>
              </div>

              <div className="cm-row">
                <span>
                  Livraison
                </span>

                <span>
                  À confirmer
                </span>
              </div>

              <div className="cm-row total">
                <span>
                  Total à payer
                </span>

                <b>
                  {fcfa(total)}
                </b>
              </div>

              {nbVendeurs > 1 && (
                <div className="cm-note">
                  📦 Vos articles viennent de{' '}
                  {nbVendeurs} vendeurs :{' '}
                  {nbVendeurs} commandes distinctes
                  seront créées.
                </div>
              )}

            </div>

          </div>

        </aside>

      </div>

    </div>
  );
};

export default Commander;
