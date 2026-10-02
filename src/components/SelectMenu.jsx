import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './SelectMenu.css';

const COULEURS = ['#dbeafe', '#fce7f3', '#dcfce7', '#fef3c7', '#ede9fe', '#cffafe', '#ffedd5', '#fee2e2'];

const sansAccent = (s = '') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const ICONES = [
  ['agriculture', '🌾'], ['elevage', '🐄'], ['alimentation', '🍽️'], ['restauration', '🍽️'], ['animaux', '🐾'],
  ['enfant', '🧸'], ['bebe', '🧸'], ['formation', '🎓'], ['cours', '🎓'], ['immobilier', '🏠'], ['informatique', '💻'],
  ['materiau', '🧱'], ['chantier', '🧱'], ['meuble', '🪑'], ['decoration', '🪑'], ['maison', '🛋️'], ['mode', '👗'],
  ['beaute', '💄'], ['moto', '🛵'], ['scooter', '🛵'], ['vehicule', '🚗'], ['automobile', '🚗'], ['service', '🛠️'],
  ['evenement', '🎉'], ['loisir', '🎮'], ['telephone', '📱'], ['tablette', '📱'], ['electronique', '🔌'],
  ['electromenager', '🔌'], ['emploi', '💼'], ['sport', '⚽'], ['autre', '📦'],
];

// Icône d'une catégorie : celle de la base si c'est un emoji, sinon choisie d'après le nom
export const iconeCategorie = (cat) => {
  const brut = (cat?.icone || '').trim();
  if (brut && /\p{Extended_Pictographic}/u.test(brut)) return brut;
  const nom = sansAccent(cat?.nom);
  const trouve = ICONES.find(([mot]) => nom.includes(mot));
  return trouve ? trouve[1] : '🏷️';
};

// options : [{ value, label, icon?, separe? }]
const SelectMenu = ({
  id,
  options = [],
  value = '',
  onChange,
  placeholder = 'Sélectionner',
  icon = '🗂️',
  searchable,
  searchPlaceholder = 'Rechercher...',
  emptyText = 'Aucun résultat',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [actif, setActif] = useState(0);
  const [place, setPlace] = useState({ haut: false, maxH: 280 });
  const racine = useRef(null);
  const declencheur = useRef(null);
  const recherche = useRef(null);
  const liste = useRef(null);

  const avecRecherche = searchable ?? options.length > 7;
  const indexChoisie = options.findIndex((o) => o.value === value);
  const choisie = indexChoisie >= 0 ? options[indexChoisie] : null;
  const terme = sansAccent(q.trim());
  const visibles = useMemo(
    () => (terme ? options.filter((o) => sansAccent(o.label).includes(terme)) : options),
    [options, terme]
  );

  const fermer = useCallback(() => {
    setOpen(false);
    setQ('');
  }, []);

  const ouvrir = () => {
    if (disabled) return;
    const r = declencheur.current?.getBoundingClientRect();
    if (r) {
      const dessous = window.innerHeight - r.bottom;
      const dessus = r.top;
      // S'ouvre vers le haut quand il n'y a pas assez de place en bas
      const haut = dessous < 330 && dessus > dessous;
      const dispo = (haut ? dessus : dessous) - (avecRecherche ? 120 : 70);
      setPlace({ haut, maxH: Math.max(150, Math.min(300, dispo)) });
    }
    setActif(Math.max(indexChoisie, 0));
    setOpen(true);
  };

  const choisir = (opt) => {
    onChange?.(opt.value);
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

  // Curseur dans la recherche (ordinateur seulement, pour ne pas ouvrir le clavier du téléphone)
  useEffect(() => {
    if (!open || !recherche.current) return;
    try {
      if (window.matchMedia('(hover: hover)').matches) recherche.current.focus({ preventScroll: true });
    } catch (e) {
      // rien
    }
  }, [open]);

  // Garde l'option active visible
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
      setActif((i) => Math.min(i + 1, visibles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActif((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (visibles[actif]) choisir(visibles[actif]);
    } else if (e.key === 'Tab') {
      fermer();
    }
  };

  return (
    <div className={`sm-root ${open ? 'open' : ''}`} ref={racine} onKeyDown={onKeyDown}>
      <button
        type="button"
        id={id}
        ref={declencheur}
        className="sm-trigger"
        onClick={() => (open ? fermer() : ouvrir())}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span
          key={choisie ? choisie.value : 'vide'}
          className={`sm-ico ${choisie ? 'set' : ''}`}
          style={choisie ? { '--c': COULEURS[indexChoisie % COULEURS.length] } : undefined}
        >
          {choisie?.icon || icon}
        </span>
        <span className={`sm-txt ${choisie ? 'set' : ''}`}>{choisie ? choisie.label : placeholder}</span>
        <svg className="sm-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={`sm-panel ${place.haut ? 'up' : ''}`}>
          {avecRecherche && (
            <div className="sm-search">
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
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
            </div>
          )}

          <ul className="sm-list" role="listbox" ref={liste} style={{ maxHeight: place.maxH }}>
            {visibles.map((o, i) => {
              const sel = o.value === value;
              return (
                <Fragment key={o.value}>
                  {o.separe && !terme && <li className="sm-sep" role="presentation" />}
                  <li
                    role="option"
                    aria-selected={sel}
                    data-actif={i === actif}
                    className={`sm-opt ${sel ? 'sel' : ''} ${i === actif ? 'act' : ''}`}
                    style={{ '--c': COULEURS[i % COULEURS.length], animationDelay: `${Math.min(i, 10) * 22}ms` }}
                    onMouseEnter={() => setActif(i)}
                    onClick={() => choisir(o)}
                  >
                    <span className="sm-opt-ico">{o.icon || icon}</span>
                    <span className="sm-opt-name">{o.label}</span>
                    {sel && <span className="sm-check">✓</span>}
                  </li>
                </Fragment>
              );
            })}
            {visibles.length === 0 && <li className="sm-none">{emptyText}</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SelectMenu;