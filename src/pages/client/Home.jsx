import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import ImageSlideshow from '../../components/ImageSlideshow';
import CategoryDropdown from '../../components/CategoryDropdown';
import { useAuth } from '../../context/AuthContext';
import './Home.css';
import './HomeJumia.css';

const FILTRES_VIDES = { q: '', categorie: '', ville: '', prixMax: '', tri: '' };
const TRIS = { recents: 'Plus récent', popularite: 'Popularité', prix_asc: 'Prix croissant', prix_desc: 'Prix décroissant' };
const TROIS_JOURS = 3 * 24 * 3600 * 1000;
const DELAI_HERO = 6000;

const GRADIENTS = [
  'linear-gradient(135deg, #f472b6, #db2777)',
  'linear-gradient(135deg, #fb923c, #ea580c)',
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #f87171, #dc2626)',
  'linear-gradient(135deg, #34d399, #059669)',
  'linear-gradient(135deg, #38bdf8, #0284c7)',
  'linear-gradient(135deg, #facc15, #d97706)',
  'linear-gradient(135deg, #818cf8, #4338ca)',
];

const ICONES = [
  ['immobilier', '🏠'],
  ['vehicule', '🚗'],
  ['automobile', '🚗'],
  ['telephone', '📱'],
  ['electronique', '🔌'],
  ['informatique', '💻'],
  ['maison', '🛋️'],
  ['emploi', '💼'],
  ['mode', '👗'],
  ['service', '🛠️'],
  ['autre', '📦'],
];

const sansAccent = (s = '') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const iconeCategorie = (cat) => {
  const brut = (cat?.icone || '').trim();
  if (brut && [...brut].length <= 3) return brut;
  const nom = sansAccent(cat?.nom);
  const trouve = ICONES.find(([mot]) => nom.includes(mot));
  return trouve ? trouve[1] : '🏷️';
};

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const estNouveau = (a) => a.createdAt && Date.now() - new Date(a.createdAt).getTime() < TROIS_JOURS;
const parDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
const parVues = (a, b) => (b.vues || 0) - (a.vues || 0);

const tempsRelatif = (date) => {
  const min = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.floor(min / 60)} h`;
  if (min < 10080) return `il y a ${Math.floor(min / 1440)} j`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

// Révèle un bloc avec une animation quand il arrive à l'écran
const useReveal = () => {
  const ref = useRef(null);
  const [vu, setVu] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) {
      setVu(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVu(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, vu];
};

/* ---------- Rangée horizontale avec flèches ---------- */
const Rail = ({ children }) => {
  const ref = useRef(null);
  const [can, setCan] = useState({ g: false, d: false });

  const maj = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const g = el.scrollLeft > 8;
    const d = el.scrollLeft + el.clientWidth < el.scrollWidth - 8;
    setCan((p) => (p.g === g && p.d === d ? p : { g, d }));
  }, []);

  useEffect(() => {
    maj();
  });

  useEffect(() => {
    window.addEventListener('resize', maj);
    return () => window.removeEventListener('resize', maj);
  }, [maj]);

  const aller = (sens) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: sens * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className="jm-rail-wrap">
      {can.g && (
        <button type="button" className="jm-rail-btn g" onClick={() => aller(-1)} aria-label="Précédent">
          ‹
        </button>
      )}
      <div className="jm-rail" ref={ref} onScroll={maj}>
        {children}
      </div>
      {can.d && (
        <button type="button" className="jm-rail-btn d" onClick={() => aller(1)} aria-label="Suivant">
          ›
        </button>
      )}
    </div>
  );
};

/* ---------- Section avec titre, « Voir plus » et animation d'apparition ---------- */
const Section = ({ theme, titre, sous, onPlus, children }) => {
  const [ref, vu] = useReveal();
  return (
    <section ref={ref} className={`jm-sec ${theme} jm-reveal ${vu ? 'in' : ''}`}>
      <div className="jm-sec-head">
        <div>
          <h2 className="jm-sec-title">{titre}</h2>
          {sous && <p className="jm-sec-sub">{sous}</p>}
        </div>
        {onPlus && (
          <button type="button" className="jm-more" onClick={onPlus}>
            Voir plus <span>→</span>
          </button>
        )}
      </div>
      <Rail>{children}</Rail>
    </section>
  );
};

/* ---------- Carte d'annonce ---------- */
const AnnonceCard = ({ a, i = 0, strip, hot = false, rail = false, onOpen }) => (
  <article
    className="hm-card"
    style={rail ? { '--d': `${Math.min(i, 8) * 70}ms` } : { animationDelay: `${Math.min(i, 12) * 60}ms` }}
    onClick={() => onOpen(a._id)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') onOpen(a._id);
    }}
    tabIndex={0}
    role="link"
    aria-label={a.titre}
  >
    <div className="hm-img">
      <ImageSlideshow images={a.images} alt={a.titre} offset={(i % 8) * 450} />
      {a.categorie?.nom && <span className="hm-badge-cat">{a.categorie.nom}</span>}
      {estNouveau(a) && <span className="hm-badge-new">Nouveau</span>}
      <div className="hm-overlay">
        <span>Voir l'annonce →</span>
      </div>
    </div>
    {strip && <div className={`jm-strip ${hot ? 'hot' : ''}`}>{strip}</div>}
    <div className="hm-body">
      <h3 className="hm-title">{a.titre}</h3>
      <p className="hm-price">{fcfa(a.prix)}</p>
      <div className="hm-meta">
        <span>📍 {a.ville}</span>
        {a.utilisateur?.prenom && <span className="hm-seller">{a.utilisateur.prenom}</span>}
      </div>
    </div>
  </article>
);

/* ---------- Grille avec « Afficher plus » ---------- */
const Grille = ({ items, onOpen, pas = 12 }) => {
  const [n, setN] = useState(pas);
  return (
    <>
      <div className="hm-grid">
        {items.slice(0, n).map((a, i) => (
          <AnnonceCard key={a._id} a={a} i={i % pas} onOpen={onOpen} />
        ))}
      </div>
      {items.length > n && (
        <div className="jm-more-wrap">
          <button type="button" className="jm-load" onClick={() => setN((x) => x + pas)}>
            Afficher plus ({items.length - n} restante{items.length - n > 1 ? 's' : ''})
          </button>
        </div>
      )}
    </>
  );
};

/* ---------- Carrousel de bannières ---------- */
const Hero = ({ slides }) => {
  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);
  const touch = useRef(null);
  const n = slides.length;

  useEffect(() => {
    if (i >= n) setI(0);
  }, [n, i]);

  useEffect(() => {
    if (n < 2 || pause) return undefined;
    let reduit = false;
    try {
      reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      reduit = false;
    }
    if (reduit) return undefined;
    const t = setTimeout(() => setI((x) => (x + 1) % n), DELAI_HERO);
    return () => clearTimeout(t);
  }, [i, n, pause]);

  const aller = (sens) => setI((x) => (x + sens + n) % n);

  return (
    <section
      className="jm-hero"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      onTouchStart={(e) => {
        touch.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 50) aller(dx < 0 ? 1 : -1);
      }}
      aria-roledescription="carrousel"
    >
      {slides.map((s, idx) => {
        const actif = idx === i;
        return (
          <div key={s.cle} className={`jm-slide ${s.cls} ${actif ? 'on' : ''}`} aria-hidden={!actif}>
            <div className="jm-slide-txt">
              {s.pastille ? (
                <span className="jm-live">
                  <i /> {s.pastille}
                </span>
              ) : (
                <span className="jm-eyebrow">{s.eyebrow}</span>
              )}
              <h2 className="jm-h">{s.titre}</h2>
              {s.texte && <p className="jm-p">{s.texte}</p>}
              {s.prix && <div className="jm-slide-price">{s.prix}</div>}
              {s.cta &&
                (s.cta.to ? (
                  <Link to={s.cta.to} className="jm-cta" tabIndex={actif ? 0 : -1}>
                    {s.cta.label} <span>→</span>
                  </Link>
                ) : (
                  <button type="button" className="jm-cta" onClick={s.cta.action} tabIndex={actif ? 0 : -1}>
                    {s.cta.label} <span>→</span>
                  </button>
                ))}
            </div>
            {s.image ? (
              <Link to={s.cta.to} className="jm-feat" tabIndex={-1} aria-hidden="true">
                <img src={imageUrl(s.image)} alt="" />
              </Link>
            ) : (
              <div className="jm-deco" aria-hidden="true">
                {s.deco}
              </div>
            )}
          </div>
        );
      })}

      {n > 1 && (
        <>
          <button type="button" className="jm-arrow g" onClick={() => aller(-1)} aria-label="Bannière précédente">
            ‹
          </button>
          <button type="button" className="jm-arrow d" onClick={() => aller(1)} aria-label="Bannière suivante">
            ›
          </button>
          <div className="jm-dots">
            {slides.map((s, idx) => (
              <button key={s.cle} type="button" className={`jm-dot ${idx === i ? 'on' : ''}`} onClick={() => setI(idx)} aria-label={`Bannière ${idx + 1}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

/* ---------- Bandeau « Vendre » ---------- */
const BandeauVendre = ({ user, isVendeur }) => {
  const [ref, vu] = useReveal();
  if (user && !isVendeur) return null;
  return (
    <section ref={ref} className={`jm-banner jm-reveal ${vu ? 'in' : ''}`}>
      <div className="jm-banner-in">
        <div>
          <h3>Vous avez quelque chose à vendre ?</h3>
          <p>Publiez votre annonce avec plusieurs photos et recevez des commandes directement sur Annonces+.</p>
          <Link to={isVendeur ? '/publier' : '/inscription?role=vendeur'} className="jm-cta">
            {isVendeur ? '➕ Publier une annonce' : 'Devenir vendeur'} <span>→</span>
          </Link>
        </div>
        <div className="jm-banner-ico" aria-hidden="true">
          📦
        </div>
      </div>
    </section>
  );
};

/* ---------- Pied de page ---------- */
const PiedDePage = ({ user, isClient, isVendeur }) => (
  <footer className="jm-footer">
    <div className="jm-footer-grid">
      <div>
        <div className="jm-brand">
          Annonces<span>+</span>
        </div>
        <p>La plateforme de petites annonces du Sénégal : achetez, vendez et échangez simplement, près de chez vous.</p>
      </div>

      <div>
        <h4>Acheter</h4>
        <ul>
          <li><Link to="/">Toutes les annonces</Link></li>
          <li><Link to="/categories">Catégories</Link></li>
          {user && isClient && <li><Link to="/panier">Mon panier</Link></li>}
          {user && isClient && <li><Link to="/mes-commandes">Mes commandes</Link></li>}
          {!user && <li><Link to="/connexion">Connexion</Link></li>}
        </ul>
      </div>

      <div>
        <h4>Vendre</h4>
        <ul>
          {isVendeur ? (
            <>
              <li><Link to="/publier">Publier une annonce</Link></li>
              <li><Link to="/mes-annonces">Mes annonces</Link></li>
              <li><Link to="/vendeur/commandes">Commandes reçues</Link></li>
            </>
          ) : (
            <li><Link to="/inscription?role=vendeur">Devenir vendeur</Link></li>
          )}
        </ul>
      </div>

      <div>
        <h4>Mon compte</h4>
        <ul>
          {user ? (
            <>
              <li><Link to="/profil">Mon profil</Link></li>
              <li><Link to="/messages">Messages</Link></li>
              <li><Link to="/notifications">Notifications</Link></li>
              <li><Link to="/favoris">Favoris</Link></li>
            </>
          ) : (
            <>
              <li><Link to="/connexion">Se connecter</Link></li>
              <li><Link to="/inscription">Créer un compte</Link></li>
            </>
          )}
        </ul>
      </div>
    </div>
    <div className="jm-footer-bottom">
      <span>© {new Date().getFullYear()} Annonces+ · Tous droits réservés</span>
      <span>Fait avec ❤️ au Sénégal</span>
    </div>
  </footer>
);

/* ====================== PAGE D'ACCUEIL ====================== */
const Home = () => {
  const { user, isVendeur, isClient } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [tous, setTous] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [essai, setEssai] = useState(0);
  const [filtres, setFiltres] = useState(FILTRES_VIDES);
  const [plus, setPlus] = useState(false);
  const [haut, setHaut] = useState(false);
  const dejaCharge = useRef(false);
  const resultatsRef = useRef(null);
  const listeRef = useRef(null);

  // Toutes les annonces : un seul chargement, puis actualisation discrète toutes les 30 s
  useEffect(() => {
    let annule = false;
    api
      .get('/annonces')
      .then((res) => {
        if (annule) return;
        dejaCharge.current = true;
        setErreur(false);
        setTous(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (annule) return;
        console.error(err);
        if (!dejaCharge.current) setErreur(true);
      })
      .finally(() => {
        if (!annule) setLoading(false);
      });
    return () => {
      annule = true;
    };
  }, [essai]);

  useEffect(() => {
    if (categories.length > 0) return;
    api
      .get('/categories')
      .then((res) => {
        if (Array.isArray(res.data)) setCategories(res.data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essai]);

  // Si le serveur ne répond pas, on réessaie toutes les 5 secondes
  useEffect(() => {
    const t = setInterval(() => setEssai((n) => n + 1), erreur ? 5000 : 30000);
    return () => clearInterval(t);
  }, [erreur]);

  useEffect(() => {
    const onScroll = () => setHaut(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ----- Données dérivées ----- */
  const comptes = useMemo(() => {
    const c = {};
    tous.forEach((a) => {
      const id = a.categorie?._id;
      if (id) c[id] = (c[id] || 0) + 1;
    });
    return c;
  }, [tous]);

  // Annonces de chaque catégorie (les plus consultées d'abord, celles avec photo en premier)
  const parCat = useMemo(() => {
    const m = {};
    [...tous]
      .sort(parVues)
      .sort((a, b) => Number((b.images || []).some(Boolean)) - Number((a.images || []).some(Boolean)))
      .forEach((a) => {
        const id = a.categorie?._id;
        if (id) (m[id] = m[id] || []).push(a);
      });
    return m;
  }, [tous]);

  const filtreActif = Object.values(filtres).some((v) => v !== '');
  const nbExtras = ['ville', 'prixMax', 'tri'].filter((k) => filtres[k] !== '').length;

  const resultats = useMemo(() => {
    const mots = sansAccent(filtres.q.trim()).split(/\s+/).filter(Boolean);
    const ville = sansAccent(filtres.ville.trim());
    const prixMax = Number(filtres.prixMax);

    const liste = tous.filter((a) => {
      if (filtres.categorie && a.categorie?._id !== filtres.categorie) return false;
      if (ville && !sansAccent(a.ville).includes(ville)) return false;
      if (prixMax > 0 && a.prix > prixMax) return false;
      if (mots.length) {
        const texte = sansAccent(`${a.titre} ${a.description || ''} ${a.ville || ''} ${a.categorie?.nom || ''}`);
        if (!mots.every((m) => texte.includes(m))) return false;
      }
      return true;
    });

    if (filtres.tri === 'popularite') liste.sort(parVues);
    else if (filtres.tri === 'prix_asc') liste.sort((a, b) => a.prix - b.prix);
    else if (filtres.tri === 'prix_desc') liste.sort((a, b) => b.prix - a.prix);
    else liste.sort(parDate);
    return liste;
  }, [tous, filtres]);

  const nouveautes = useMemo(() => [...tous].sort(parDate).slice(0, 12), [tous]);
  const populaires = useMemo(() => [...tous].sort(parVues).slice(0, 12), [tous]);
  const petitsPrix = useMemo(() => [...tous].sort((a, b) => a.prix - b.prix).slice(0, 12), [tous]);
  const aLaUne = useMemo(() => [...tous].sort(parVues).find((a) => (a.images || []).some(Boolean)), [tous]);
  const catsTriees = useMemo(() => [...categories].sort((a, b) => (comptes[b._id] || 0) - (comptes[a._id] || 0)), [categories, comptes]);
  const sectionsCat = useMemo(() => catsTriees.filter((c) => (comptes[c._id] || 0) >= 2).slice(0, 3), [catsTriees, comptes]);

  /* ----- Actions ----- */
  const scrollResultats = () =>
    setTimeout(() => resultatsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  const appliquer = (patch) => {
    setFiltres((f) => ({ ...f, ...patch }));
    scrollResultats();
  };
  const choisirCat = (id) => {
    const deja = filtres.categorie === id;
    setFiltres((f) => ({ ...f, categorie: deja ? '' : id }));
  };
  const onChange = (e) => setFiltres((f) => ({ ...f, [e.target.name]: e.target.value }));
  const reinit = () => {
    setFiltres(FILTRES_VIDES);
    setPlus(false);
  };
  const ouvrir = (id) => navigate(`/annonce/${id}`);
  const versAnnonces = () => listeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const etiquettes = [
    filtres.q && { cle: 'q', label: `« ${filtres.q} »` },
    filtres.categorie && { cle: 'categorie', label: categories.find((c) => c._id === filtres.categorie)?.nom || 'Catégorie' },
    filtres.ville && { cle: 'ville', label: `📍 ${filtres.ville}` },
    filtres.prixMax && { cle: 'prixMax', label: `≤ ${fcfa(filtres.prixMax)}` },
    filtres.tri && { cle: 'tri', label: TRIS[filtres.tri] },
  ].filter(Boolean);

  const soloCategorie = filtres.categorie && !filtres.q && !filtres.ville && !filtres.prixMax && !filtres.tri;
  const titreResultats = soloCategorie ? categories.find((c) => c._id === filtres.categorie)?.nom || 'Catégorie' : 'Résultats de la recherche';

  const slides = [
    {
      cle: 'bienvenue',
      cls: 's1',
      eyebrow: 'Annonces+ · Sénégal',
      pastille: tous.length > 0 ? `${tous.length} annonce${tous.length > 1 ? 's' : ''} en ligne` : null,
      titre: 'Trouvez la bonne affaire, près de chez vous',
      texte: 'Achetez et vendez simplement, partout au Sénégal.',
      deco: '🛍️',
      cta: tous.length > 0 ? { label: 'Découvrir les annonces', action: versAnnonces } : null,
    },
    {
      cle: 'vendre',
      cls: 's2',
      eyebrow: 'Pour les vendeurs',
      titre: 'Vendez vos articles en quelques minutes',
      texte: 'Publiez avec plusieurs photos, recevez des commandes et gérez-les depuis votre espace.',
      deco: '🏪',
      cta: isVendeur ? { label: '➕ Publier une annonce', to: '/publier' } : !user ? { label: 'Devenir vendeur', to: '/inscription?role=vendeur' } : null,
    },
    {
      cle: 'acheter',
      cls: 's3',
      eyebrow: 'Pour les acheteurs',
      titre: 'Commandez et payez à la livraison',
      texte: 'Ajoutez au panier : le vendeur accepte votre commande et vous livre.',
      deco: '🚚',
      cta: !user ? { label: 'Créer un compte', to: '/inscription' } : isClient ? { label: '🛒 Voir mon panier', to: '/panier' } : null,
    },
    aLaUne && {
      cle: 'une',
      cls: 's4',
      eyebrow: '⭐ À la une',
      titre: aLaUne.titre,
      texte: `📍 ${aLaUne.ville}${aLaUne.categorie?.nom ? ` · ${aLaUne.categorie.nom}` : ''}`,
      prix: fcfa(aLaUne.prix),
      image: (aLaUne.images || []).find(Boolean),
      cta: { label: "Voir l'annonce", to: `/annonce/${aLaUne._id}` },
    },
  ].filter(Boolean);

  /* ----- Rendu ----- */
  const premierChargement = loading && tous.length === 0;
  const enErreur = erreur && tous.length === 0;

  return (
    <div className="jm-root">
      {/* Recherche */}
      <div className="jm-top">
        <form
          className="jm-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (filtreActif) scrollResultats();
          }}
        >
          <CategoryDropdown
            categories={categories}
            value={filtres.categorie}
            onChange={(id) => setFiltres((f) => ({ ...f, categorie: id }))}
            counts={!premierChargement && !enErreur ? comptes : null}
            total={tous.length}
          />

          <div className="jm-searchbar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input name="q" value={filtres.q} onChange={onChange} placeholder="Cherchez une annonce, un article, une ville..." aria-label="Rechercher une annonce" />
            {filtres.q && (
              <button type="button" className="jm-x" onClick={() => setFiltres((f) => ({ ...f, q: '' }))} aria-label="Effacer la recherche">
                ✕
              </button>
            )}
            <button type="submit" className="jm-search-btn">
              Rechercher
            </button>
          </div>

          <button type="button" className={`jm-filter-btn ${plus ? 'on' : ''}`} onClick={() => setPlus((p) => !p)} aria-expanded={plus}>
            ⚙️ Filtres {nbExtras > 0 && <b>{nbExtras}</b>}
          </button>
        </form>

        <div className={`jm-extra ${plus ? 'open' : ''}`}>
          <div className="jm-extra-in">
            <div className="jm-extra-grid">
              <input name="ville" value={filtres.ville} onChange={onChange} placeholder="📍 Ville" aria-label="Ville" />
              <input name="prixMax" type="number" min="0" value={filtres.prixMax} onChange={onChange} placeholder="Prix maximum (FCFA)" aria-label="Prix maximum" />
              <select name="tri" value={filtres.tri} onChange={onChange} aria-label="Trier par">
                <option value="">Trier par</option>
                <option value="recents">Plus récent</option>
                <option value="popularite">Popularité</option>
                <option value="prix_asc">Prix croissant</option>
                <option value="prix_desc">Prix décroissant</option>
              </select>
              <button type="button" className="jm-reset-btn" onClick={reinit} disabled={!filtreActif}>
                ↺ Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Catégories */}
      {categories.length > 0 && (
        <nav className="jm-cats" aria-label="Catégories">
          <button type="button" className={`jm-chip ${!filtres.categorie ? 'on' : ''}`} onClick={() => setFiltres((f) => ({ ...f, categorie: '' }))}>
            🗂️ Toutes
          </button>
          {catsTriees.map((c) => (
            <button key={c._id} type="button" className={`jm-chip ${filtres.categorie === c._id ? 'on' : ''}`} onClick={() => choisirCat(c._id)}>
              {iconeCategorie(c)} {c.nom}
            </button>
          ))}
        </nav>
      )}

      {/* Contenu */}
      {premierChargement ? (
        <>
          <div className="jm-skel-hero" />
          <div className="hm-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="hm-skel" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="s-img" />
                <div className="s-body">
                  <div className="s-line" style={{ width: '85%' }} />
                  <div className="s-line" style={{ width: '45%', height: 16 }} />
                  <div className="s-line" style={{ width: '65%' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : enErreur ? (
        <div className="hm-empty" style={{ marginTop: 22 }}>
          <span className="emoji">📡</span>
          <strong style={{ color: '#0f172a', fontSize: 17 }}>Impossible de joindre le serveur</strong>
          <p style={{ margin: '8px 0 0' }}>Vos annonces sont en sécurité. Nouvelle tentative automatique toutes les 5 secondes…</p>
          <button type="button" className="hm-reset" style={{ marginTop: 16 }} onClick={() => setEssai((n) => n + 1)}>
            ↻ Réessayer maintenant
          </button>
        </div>
      ) : filtreActif ? (
        /* ----- Résultats de recherche ----- */
        <section ref={resultatsRef} className="jm-anchor" style={{ marginTop: 18 }}>
          <div className="hm-head">
            <h2>
              {titreResultats}
              <span className="hm-count">
                · {resultats.length} résultat{resultats.length > 1 ? 's' : ''}
              </span>
            </h2>
            <button type="button" className="hm-reset" onClick={reinit}>
              ✕ Tout réinitialiser
            </button>
          </div>

          {etiquettes.length > 0 && (
            <div className="jm-tags">
              {etiquettes.map((t) => (
                <span key={t.cle} className="jm-tag">
                  {t.label}
                  <button type="button" onClick={() => setFiltres((f) => ({ ...f, [t.cle]: '' }))} aria-label={`Retirer ${t.label}`}>
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {resultats.length === 0 ? (
            <div className="hm-empty">
              <span className="emoji">🔎</span>
              <strong style={{ color: '#0f172a', fontSize: 17 }}>Aucune annonce trouvée</strong>
              <p style={{ margin: '8px 0 0' }}>Essayez d'autres mots ou retirez un filtre.</p>
              <button type="button" className="hm-reset" style={{ marginTop: 16 }} onClick={reinit}>
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <Grille key={JSON.stringify(filtres)} items={resultats} onOpen={ouvrir} />
          )}
        </section>
      ) : (
        /* ----- Page d'accueil ----- */
        <>
          <Hero slides={slides} />

          {/* Carrousel de catégories promotionnelles (style Jumia) : chaque carte contient ses annonces */}
          {catsTriees.length > 0 && (
            <section className="jm-promo">
              <Rail>
                {catsTriees.map((c, i) => {
                  const liste = parCat[c._id] || [];
                  const n = liste.length;
                  const vus = liste.slice(0, 4);
                  const voirCat = () => appliquer({ categorie: c._id });
                  return (
                    <div key={c._id} className="jm-promo-card" style={{ '--g': GRADIENTS[i % GRADIENTS.length] }}>
                      <button type="button" className="jm-promo-top" onClick={voirCat}>
                        <span className="jm-promo-name">{c.nom}</span>
                        <span className="jm-promo-arrow">→</span>
                      </button>

                      {n > 0 ? (
                        <div className={`jm-promo-grid n${vus.length}`}>
                          {vus.map((a) => {
                            const img = (a.images || []).find(Boolean);
                            return (
                              <button key={a._id} type="button" className="jm-promo-item" onClick={() => ouvrir(a._id)} aria-label={a.titre} title={a.titre}>
                                {img ? <img src={imageUrl(img)} alt="" loading="lazy" /> : <span className="jm-promo-noimg">{iconeCategorie(c)}</span>}
                                <span className="jm-promo-price">{fcfa(a.prix)}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="jm-promo-art">
                          <span className="jm-promo-circle" />
                          <span className="jm-promo-ico">{iconeCategorie(c)}</span>
                        </div>
                      )}

                      <button type="button" className="jm-promo-count" onClick={voirCat}>
                        {n} annonce{n > 1 ? 's' : ''}
                        {n > 4 ? ' · voir tout' : ''}
                      </button>
                    </div>
                  );
                })}
              </Rail>
            </section>
          )}

          <div ref={listeRef} className="jm-anchor" />

          {tous.length === 0 ? (
            <div className="hm-empty" style={{ marginTop: 22 }}>
              <span className="emoji">🛒</span>
              <strong style={{ color: '#0f172a', fontSize: 17 }}>Aucune annonce en ligne pour le moment</strong>
              <p style={{ margin: '8px 0 0' }}>{isVendeur ? 'Publiez la première annonce !' : 'Revenez très bientôt.'}</p>
              {isVendeur && (
                <Link to="/publier" className="jm-cta" style={{ marginTop: 16, background: '#2563eb', color: '#fff' }}>
                  ➕ Publier une annonce
                </Link>
              )}
            </div>
          ) : (
            <>
              <Section theme="white" titre="Les nouveautés d'Annonces+" sous="Les dernières annonces publiées" onPlus={() => appliquer({ tri: 'recents' })}>
                {nouveautes.map((a, i) => (
                  <AnnonceCard key={a._id} a={a} i={i} rail strip={`🕒 ${tempsRelatif(a.createdAt)}`} onOpen={ouvrir} />
                ))}
              </Section>

              {tous.length >= 5 && (
                <>
                  <Section theme="hot" titre="🔥 Les plus consultées" sous="Ce que tout le monde regarde en ce moment" onPlus={() => appliquer({ tri: 'popularite' })}>
                    {populaires.map((a, i) => (
                      <AnnonceCard key={a._id} a={a} i={i} rail hot strip={`👁️ ${a.vues || 0} vue${(a.vues || 0) > 1 ? 's' : ''}`} onOpen={ouvrir} />
                    ))}
                  </Section>

                  <Section theme="peach" titre="💰 Petits prix" sous="Les annonces les moins chères" onPlus={() => appliquer({ tri: 'prix_asc' })}>
                    {petitsPrix.map((a, i) => (
                      <AnnonceCard key={a._id} a={a} i={i} rail onOpen={ouvrir} />
                    ))}
                  </Section>

                  {sectionsCat.map((c) => (
                    <Section
                      key={c._id}
                      theme="sky"
                      titre={`${iconeCategorie(c)} ${c.nom}`}
                      sous={`${comptes[c._id]} annonces`}
                      onPlus={() => appliquer({ categorie: c._id })}
                    >
                      {tous
                        .filter((a) => a.categorie?._id === c._id)
                        .slice(0, 12)
                        .map((a, i) => (
                          <AnnonceCard key={a._id} a={a} i={i} rail onOpen={ouvrir} />
                        ))}
                    </Section>
                  ))}
                </>
              )}

              <BandeauVendre user={user} isVendeur={isVendeur} />

              <section className="jm-all">
                <div className="hm-head">
                  <h2>
                    Toutes les annonces
                    <span className="hm-count">
                      · {tous.length} annonce{tous.length > 1 ? 's' : ''}
                    </span>
                  </h2>
                </div>
                <Grille items={tous} onOpen={ouvrir} />
              </section>
            </>
          )}
        </>
      )}

      <PiedDePage user={user} isClient={isClient} isVendeur={isVendeur} />

      {haut && (
        <button type="button" className="jm-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Remonter en haut">
          ↑
        </button>
      )}
    </div>
  );
};

export default Home;