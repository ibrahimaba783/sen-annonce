import { useEffect, useRef, useState, useCallback } from 'react';

const COULEURS = ['#dbeafe', '#fce7f3', '#dcfce7', '#fef3c7', '#ede9fe', '#cffafe', '#ffedd5', '#fee2e2'];

// Icône de secours quand la catégorie n'en a pas
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

// counts : { idCategorie: nombre d'annonces } ou null tant que les chiffres ne sont pas connus
const CategoryDropdown = ({ categories = [], value = '', onChange, counts = null, total = null }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [actif, setActif] = useState(0);
  const racine = useRef(null);
  const declencheur = useRef(null);
  const recherche = useRef(null);
  const liste = useRef(null);

  const choisie = categories.find((c) => c._id === value);
  const terme = sansAccent(q.trim());
  const visibles = terme ? categories.filter((c) => sansAccent(c.nom).includes(terme)) : categories;
  const options = terme ? visibles : [{ _id: '', nom: 'Toutes les catégories', tout: true }, ...categories];

  const fermer = useCallback(() => {
    setOpen(false);
    setQ('');
  }, []);

  const ouvrir = () => {
    const i = value ? categories.findIndex((c) => c._id === value) + 1 : 0;
    setActif(Math.max(i, 0));
    setOpen(true);
  };

  const choisir = (opt) => {
    onChange(opt._id);
    fermer();
    declencheur.current?.focus();
  };

  // Ferme le menu quand on clique ailleurs
  useEffect(() => {
    if (!open) return undefined;
    const dehors = (e) => {
      if (racine.current && !racine.current.contains(e.target)) fermer();
    };
    document.addEventListener('mousedown', dehors);
    document.addEventListener('touchstart', dehors);
    return () => {
      document.removeEventListener('mousedown', dehors);
      document.removeEventListener('touchstart', dehors);
    };
  }, [open, fermer]);

  // Place le curseur dans la recherche (sur ordinateur seulement, pour ne pas ouvrir le clavier du téléphone)
  useEffect(() => {
    if (!open || !recherche.current) return;
    try {
      if (window.matchMedia('(hover: hover)').matches) recherche.current.focus({ preventScroll: true });
    } catch (e) {
      // rien
    }
  }, [open]);

  // Garde l'option active visible dans la liste
  useEffect(() => {
    if (!open || !liste.current) return;
    const el = liste.current.querySelector('[data-actif="true"]');
    if (!el) return;
    const boite = liste.current;
    const haut = el.offsetTop;
    const bas = haut + el.offsetHeight;
    if (haut < boite.scrollTop) boite.scrollTop = haut;
    else if (bas > boite.scrollTop + boite.clientHeight) boite.scrollTop = bas - boite.clientHeight;
  }, [open, actif]);

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        ouvrir();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      fermer();
      declencheur.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActif((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActif((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[actif]) choisir(options[actif]);
    } else if (e.key === 'Tab') {
      fermer();
    }
  };

  return (
    <div className={`cd-root full ${open ? 'open' : ''}`} ref={racine} onKeyDown={onKeyDown}>
      <button
        type="button"
        ref={declencheur}
        className="cd-trigger"
        onClick={() => (open ? fermer() : ouvrir())}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="cd-trigger-ico">{choisie ? iconeCategorie(choisie) : '🗂️'}</span>
        <span className={`cd-trigger-txt ${choisie ? 'set' : ''}`}>{choisie ? choisie.nom : 'Toutes les catégories'}</span>
        <svg className="cd-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="cd-panel">
          {categories.length > 6 && (
            <div className="cd-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={recherche}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActif(0);
                }}
                placeholder="Rechercher une catégorie..."
                aria-label="Rechercher une catégorie"
              />
            </div>
          )}

          <ul className="cd-list" role="listbox" ref={liste}>
            {options.map((o, i) => {
              const sel = value === o._id;
              const n = counts ? (o.tout ? total : counts[o._id] || 0) : null;
              return (
                <li
                  key={o._id || 'tout'}
                  role="option"
                  aria-selected={sel}
                  data-actif={i === actif}
                  className={`cd-opt ${sel ? 'sel' : ''} ${i === actif ? 'act' : ''} ${n === 0 ? 'zero' : ''}`}
                  style={{ '--c': COULEURS[i % COULEURS.length], animationDelay: `${Math.min(i, 10) * 25}ms` }}
                  onMouseEnter={() => setActif(i)}
                  onClick={() => choisir(o)}
                >
                  <span className="cd-ico">{o.tout ? '🗂️' : iconeCategorie(o)}</span>
                  <span className="cd-name">{o.nom}</span>
                  {n !== null && n !== undefined && <span className="cd-count">{n}</span>}
                  {sel && <span className="cd-check">✓</span>}
                </li>
              );
            })}
            {options.length === 0 && <li className="cd-none">Aucune catégorie trouvée</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CategoryDropdown;