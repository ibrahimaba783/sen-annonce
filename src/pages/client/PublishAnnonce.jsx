import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import SelectMenu, { iconeCategorie } from '../../components/SelectMenu';
import PreviewSlides from '../../components/PreviewSlides';
import './PublishAnnonce.css';

const MAX_PHOTOS = 5;
const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo
const TYPES_OK = ['image/jpeg', 'image/png', 'image/webp'];
const VILLES = [
  'Dakar', 'Pikine', 'Guédiawaye', 'Rufisque', 'Thiès', 'Mbour', 'Saint-Louis', 'Touba', 'Kaolack', 'Ziguinchor',
  'Diourbel', 'Louga', 'Tambacounda', 'Kolda', 'Fatick', 'Kaffrine', 'Matam', 'Sédhiou', 'Kédougou',
];
const OPTIONS_VILLES = [
  ...VILLES.map((v) => ({ value: v, label: v, icon: '📍' })),
  { value: '__autre', label: 'Autre ville…', icon: '✏️', separe: true },
];
const CONFETTIS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const FORM_VIDE = { titre: '', categorie: '', prix: '', ville: '', villeAutre: '', description: '' };

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

const PublishAnnonce = () => {
  const { user, isVendeur } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const timerRef = useRef(null);
  const photosRef = useRef([]);

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(FORM_VIDE);
  const [photos, setPhotos] = useState([]);
  const [erreurs, setErreurs] = useState({});
  const [survol, setSurvol] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [progression, setProgression] = useState(0);
  const [succes, setSucces] = useState(null);
  const [toast, setToast] = useState(null);

  photosRef.current = photos;

  const showToast = useCallback((text, type = 'ok') => {
    setToast({ text, type });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
    return () => {
      clearTimeout(timerRef.current);
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  const optionsCategories = useMemo(
    () => categories.map((c) => ({ value: c._id, label: c.nom, icon: iconeCategorie(c) })),
    [categories]
  );

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (erreurs[name]) setErreurs((er) => ({ ...er, [name]: undefined }));
  };

  const choisir = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (erreurs[name]) setErreurs((er) => ({ ...er, [name]: undefined }));
  };

  // ----- Photos -----
  const ajouterFichiers = (liste) => {
    const fichiers = Array.from(liste || []);
    if (fichiers.length === 0) return;

    const place = MAX_PHOTOS - photos.length;
    if (place <= 0) return showToast(`Maximum ${MAX_PHOTOS} photos`, 'err');

    const valides = [];
    let refuses = 0;
    fichiers.forEach((f) => {
      if (!TYPES_OK.includes(f.type) || f.size > TAILLE_MAX) refuses += 1;
      else valides.push(f);
    });

    const retenues = valides.slice(0, place);
    if (refuses > 0) showToast(`${refuses} fichier${refuses > 1 ? 's' : ''} refusé${refuses > 1 ? 's' : ''} : JPG, PNG ou WebP, 5 Mo maximum`, 'err');
    else if (valides.length > place) showToast(`Maximum ${MAX_PHOTOS} photos : les autres ont été ignorées`, 'err');

    if (retenues.length === 0) return;
    setPhotos((p) => [
      ...p,
      ...retenues.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        url: URL.createObjectURL(f),
      })),
    ]);
  };

  const choisirFichiers = (e) => {
    ajouterFichiers(e.target.files);
    if (fileRef.current) fileRef.current.value = '';
  };

  const deposer = (e) => {
    e.preventDefault();
    setSurvol(false);
    ajouterFichiers(e.dataTransfer?.files);
  };

  const retirer = (id) => {
    setPhotos((p) => {
      const cible = p.find((x) => x.id === id);
      if (cible) URL.revokeObjectURL(cible.url);
      return p.filter((x) => x.id !== id);
    });
  };

  const definirPrincipale = (id) => {
    setPhotos((p) => {
      const cible = p.find((x) => x.id === id);
      return cible ? [cible, ...p.filter((x) => x.id !== id)] : p;
    });
  };

  // ----- Données dérivées -----
  const villeFinale = form.ville === '__autre' ? form.villeAutre.trim() : form.ville;
  const prixNombre = Number(form.prix);
  const categorieNom = categories.find((c) => c._id === form.categorie)?.nom || '';

  const etapes = [
    photos.length > 0,
    form.titre.trim().length >= 3,
    !!form.categorie,
    prixNombre > 0,
    !!villeFinale,
    form.description.trim().length >= 10,
  ];
  const pourcentage = Math.round((etapes.filter(Boolean).length / etapes.length) * 100);

  // ----- Envoi -----
  const valider = () => {
    const er = {};
    if (form.titre.trim().length < 3) er.titre = 'Le titre doit contenir au moins 3 caractères';
    if (!form.categorie) er.categorie = 'Choisissez une catégorie';
    if (!(prixNombre > 0)) er.prix = 'Indiquez un prix supérieur à 0';
    if (!villeFinale) er.ville = form.ville === '__autre' ? 'Saisissez le nom de la ville' : 'Choisissez une ville';
    if (form.description.trim().length < 10) er.description = 'Décrivez votre article en au moins 10 caractères';
    return er;
  };

  const publier = async (e) => {
    e.preventDefault();
    const er = valider();
    setErreurs(er);

    const premier = Object.keys(er)[0];
    if (premier) {
      const cible = document.getElementById(`pa-${premier === 'ville' && form.ville === '__autre' ? 'villeAutre' : premier}`);
      if (cible) {
        cible.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cible.focus({ preventScroll: true });
      }
      return;
    }

    setEnvoi(true);
    setProgression(0);
    try {
      const fd = new FormData();
      fd.append('titre', form.titre.trim());
      fd.append('description', form.description.trim());
      fd.append('prix', String(prixNombre));
      fd.append('categorie', form.categorie);
      fd.append('ville', villeFinale);
      photos.forEach((p) => fd.append('images', p.file));

      const { data } = await api.post('/annonces', fd, {
        onUploadProgress: (ev) => {
          if (ev.total) setProgression(Math.round((ev.loaded * 100) / ev.total));
        },
      });
      setSucces(data);
    } catch (err) {
      showToast(err.response?.data?.message || "Erreur lors de la publication de l'annonce", 'err');
    } finally {
      setEnvoi(false);
    }
  };

  const recommencer = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setForm(FORM_VIDE);
    setErreurs({});
    setSucces(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isVendeur) {
    return (
      <div className="pa-root">
        <div className="pa-locked">
          <span className="emoji">🔒</span>
          <h3>Réservé aux vendeurs</h3>
          <p>Seuls les comptes vendeurs peuvent publier des annonces. Créez un compte vendeur pour vendre vos articles.</p>
          <Link to="/" className="pa-btn primary" style={{ display: 'inline-flex', padding: '13px 24px' }}>
            <span className="txt">Retour à l'accueil</span>
          </Link>
        </div>
      </div>
    );
  }

  const urls = photos.map((p) => p.url);

  return (
    <div className="pa-root">
      {toast && <div className={`pa-toast ${toast.type}`}>{toast.text}</div>}

      <div className="pa-top">
        <button type="button" className="pa-back" onClick={() => navigate(-1)} aria-label="Retour">
          ←
        </button>
        <div>
          <h1>Publier une annonce</h1>
          <p>Remplissez les informations : votre annonce sera visible sur l'accueil.</p>
        </div>
      </div>

      <div className="pa-progress">
        <div className="pa-progress-head">
          <span>{pourcentage === 100 ? '🎉 Votre annonce est prête !' : "Complétion de l'annonce"}</span>
          <b>{pourcentage}%</b>
        </div>
        <div className="pa-bar">
          <span style={{ width: `${pourcentage}%` }} />
        </div>
      </div>

      <div className="pa-layout">
        <form className="pa-form" onSubmit={publier} noValidate>
          {/* 1. Photos */}
          <section className="pa-card">
            <div className="pa-card-head">
              <span className="pa-step">1</span>
              <div>
                <h2>Photos</h2>
                <p>La première photo sera l'image principale de l'annonce.</p>
              </div>
            </div>

            <button
              type="button"
              className={`pa-drop ${survol ? 'over' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setSurvol(true);
              }}
              onDragLeave={() => setSurvol(false)}
              onDrop={deposer}
              disabled={photos.length >= MAX_PHOTOS}
            >
              <span className="pa-drop-ico">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </span>
              <b>Ajouter des photos ({photos.length}/{MAX_PHOTOS})</b>
              <span>
                Glissez-déposez vos images ici ou <u>parcourez vos fichiers</u>
              </span>
              <span>JPG, PNG ou WebP · 5 Mo maximum par photo</span>
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={choisirFichiers} style={{ display: 'none' }} />

            {photos.length > 0 && (
              <>
                <div className="pa-photos">
                  {photos.map((p, idx) => (
                    <div key={p.id} className={`pa-photo ${idx === 0 ? 'main' : ''}`}>
                      <img src={p.url} alt={`Photo ${idx + 1}`} />
                      {idx === 0 && <span className="pa-main-tag">★ Principale</span>}
                      <div className="pa-photo-btns">
                        <button type="button" className="pa-x" onClick={() => retirer(p.id)} aria-label="Retirer cette photo">
                          ✕
                        </button>
                        {idx !== 0 && (
                          <button type="button" className="pa-star" onClick={() => definirPrincipale(p.id)}>
                            ★ Principale
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pa-photo-count">
                  <span>
                    {photos.length} photo{photos.length > 1 ? 's' : ''} sur {MAX_PHOTOS}
                  </span>
                  {photos.length > 1 && <span>💡 Avec plusieurs photos, votre annonce défile en diaporama</span>}
                </div>
              </>
            )}
          </section>

          {/* 2. Informations */}
          <section className="pa-card">
            <div className="pa-card-head">
              <span className="pa-step">2</span>
              <div>
                <h2>Informations</h2>
                <p>Un titre clair et un bon prix attirent plus d'acheteurs.</p>
              </div>
            </div>

            <div className="pa-grid">
              <div className={`pa-field full ${erreurs.titre ? 'err' : ''}`}>
                <label htmlFor="pa-titre">
                  Titre de l'annonce <small>{form.titre.length}/80</small>
                </label>
                <input id="pa-titre" className="pa-input" name="titre" value={form.titre} onChange={onChange} maxLength={80} placeholder="Ex : iPhone 13 Pro 128 Go" />
                {erreurs.titre && <span className="pa-error">{erreurs.titre}</span>}
              </div>

              <div className={`pa-field ${erreurs.categorie ? 'err' : ''}`}>
                <label htmlFor="pa-categorie">Catégorie</label>
                <SelectMenu
                  id="pa-categorie"
                  options={optionsCategories}
                  value={form.categorie}
                  onChange={(v) => choisir('categorie', v)}
                  placeholder="Sélectionner"
                  icon="🗂️"
                  searchPlaceholder="Rechercher une catégorie..."
                />
                {erreurs.categorie && <span className="pa-error">{erreurs.categorie}</span>}
              </div>

              <div className={`pa-field ${erreurs.prix ? 'err' : ''}`}>
                <label htmlFor="pa-prix">Prix (FCFA)</label>
                <div className="pa-price-wrap">
                  <input id="pa-prix" className="pa-input" name="prix" type="number" min="0" inputMode="numeric" value={form.prix} onChange={onChange} placeholder="Ex : 250000" />
                  <em>FCFA</em>
                </div>
                {prixNombre > 0 && !erreurs.prix && (
                  <span className="pa-hint">
                    Affiché : <b>{fcfa(prixNombre)}</b>
                  </span>
                )}
                {erreurs.prix && <span className="pa-error">{erreurs.prix}</span>}
              </div>

              <div className={`pa-field ${form.ville === '__autre' ? '' : 'full'} ${erreurs.ville && form.ville !== '__autre' ? 'err' : ''}`}>
                <label htmlFor="pa-ville">Localisation</label>
                <SelectMenu
                  id="pa-ville"
                  options={OPTIONS_VILLES}
                  value={form.ville}
                  onChange={(v) => choisir('ville', v)}
                  placeholder="Sélectionner la ville"
                  icon="📍"
                  searchPlaceholder="Rechercher une ville..."
                />
                {erreurs.ville && form.ville !== '__autre' && <span className="pa-error">{erreurs.ville}</span>}
              </div>

              {form.ville === '__autre' && (
                <div className={`pa-field ${erreurs.ville ? 'err' : ''}`}>
                  <label htmlFor="pa-villeAutre">Nom de la ville</label>
                  <input id="pa-villeAutre" className="pa-input" name="villeAutre" value={form.villeAutre} onChange={onChange} placeholder="Ex : Joal-Fadiouth" />
                  {erreurs.ville && <span className="pa-error">{erreurs.ville}</span>}
                </div>
              )}
            </div>
          </section>

          {/* 3. Description */}
          <section className="pa-card">
            <div className="pa-card-head">
              <span className="pa-step">3</span>
              <div>
                <h2>Description</h2>
                <p>Précisez l'état, les dimensions, la marque, les défauts éventuels…</p>
              </div>
            </div>

            <div className={`pa-field ${erreurs.description ? 'err' : ''}`}>
              <label htmlFor="pa-description">
                Description détaillée <small className={`pa-count ${form.description.length > 0 && form.description.trim().length < 10 ? 'warn' : ''}`}>{form.description.length}/1000</small>
              </label>
              <textarea
                id="pa-description"
                className="pa-textarea"
                name="description"
                value={form.description}
                onChange={onChange}
                maxLength={1000}
                placeholder="Décrivez votre article : état, caractéristiques, raison de la vente…"
              />
              {erreurs.description && <span className="pa-error">{erreurs.description}</span>}
            </div>
          </section>

          <div className="pa-submit">
            <button type="button" className="pa-btn ghost" onClick={() => navigate(-1)} disabled={envoi}>
              Annuler
            </button>
            <button type="submit" className="pa-btn primary" disabled={envoi}>
              {envoi && <span className="fill" style={{ width: `${progression}%` }} />}
              <span className="txt">
                {envoi ? (
                  <>
                    <span className="pa-spin" /> Publication… {progression}%
                  </>
                ) : (
                  "🚀 Publier l'annonce"
                )}
              </span>
            </button>
          </div>
        </form>

        {/* Aperçu en direct */}
        <aside className="pa-side">
          <div>
            <h3>
              <span className="pa-live" /> Aperçu en direct
            </h3>
            <div className="pa-pv">
              <div className="pa-pv-img">
                <PreviewSlides urls={urls} />
                {categorieNom && <span className="pa-pv-cat">{categorieNom}</span>}
                <span className="pa-pv-new">Nouveau</span>
              </div>
              <div className="pa-pv-body">
                <h4 className={`pa-pv-title ${form.titre.trim() ? '' : 'ph'}`}>{form.titre.trim() || 'Le titre de votre annonce'}</h4>
                <p className={`pa-pv-price ${prixNombre > 0 ? '' : 'ph'}`}>{prixNombre > 0 ? fcfa(prixNombre) : '0 FCFA'}</p>
                <div className={`pa-pv-meta ${villeFinale ? '' : 'ph'}`}>
                  <span>📍 {villeFinale || 'Ville'}</span>
                  <span>{user?.prenom}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pa-tips">
            <h3 style={{ marginBottom: 10 }}>💡 Conseils pour vendre vite</h3>
            <ul>
              <li>Prenez des photos lumineuses, sous plusieurs angles</li>
              <li>Mettez la meilleure photo en principale</li>
              <li>Indiquez un prix juste et une description honnête</li>
              <li>Répondez vite aux messages des acheteurs</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Succès */}
      {succes && (
        <div className="pa-overlay">
          <div className="pa-modal" role="dialog" aria-modal="true">
            <div className="pa-confetti" aria-hidden="true">
              {Array.from({ length: 18 }).map((_, i) => (
                <i
                  key={i}
                  style={{
                    left: `${(i * 37) % 100}%`,
                    background: CONFETTIS[i % CONFETTIS.length],
                    animationDelay: `${(i % 6) * 0.25}s`,
                    animationDuration: `${2.2 + (i % 4) * 0.4}s`,
                  }}
                />
              ))}
            </div>
            <div className="pa-check">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3>Annonce publiée !</h3>
            <p>Votre annonce « {succes.titre} » est maintenant en ligne et visible par tous les acheteurs.</p>
            <div className="pa-modal-actions">
              <button className="pa-btn primary" onClick={() => navigate(`/annonce/${succes._id}`)}>
                <span className="txt">👁️ Voir mon annonce</span>
              </button>
              <button className="pa-btn soft" onClick={() => navigate('/mes-annonces')}>
                📋 Mes annonces
              </button>
              <button className="pa-btn ghost" onClick={recommencer}>
                ➕ Publier une autre annonce
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublishAnnonce;