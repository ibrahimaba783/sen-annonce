import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import { useAuth } from '../../context/AuthContext';
import SelectMenu, { iconeCategorie } from '../../components/SelectMenu';
import PreviewSlides from '../../components/PreviewSlides';
import './PublishAnnonce.css';
import './EditAnnonce.css';

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

const FORM_VIDE = { titre: '', categorie: '', prix: '', ville: '', villeAutre: '', description: '' };

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

const etatDe = (a) => {
  if (a.statut === 'en_attente') return { label: 'En attente de validation', cls: 'wait' };
  if (a.statut === 'refusee') return { label: 'Refusée', cls: 'ko' };
  if (a.actif === false) return { label: 'Masquée', cls: 'off' };
  return { label: 'En ligne', cls: 'on' };
};

const EditAnnonce = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const timerRef = useRef(null);
  const photosRef = useRef([]);

  const [annonce, setAnnonce] = useState(null);
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');
  const [form, setForm] = useState(FORM_VIDE);
  const [photos, setPhotos] = useState([]);
  const [erreurs, setErreurs] = useState({});
  const [survol, setSurvol] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [progression, setProgression] = useState(0);
  const [succes, setSucces] = useState(false);
  const [toast, setToast] = useState(null);

  photosRef.current = photos;

  const showToast = useCallback((text, type = 'ok') => {
    setToast({ text, type });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Chargement de l'annonce et des catégories
  useEffect(() => {
    let annule = false;
    setChargement(true);
    setErreurChargement('');

    Promise.all([api.get(`/annonces/${id}`), api.get('/categories')])
      .then(([resAnnonce, resCategories]) => {
        if (annule) return;
        const a = resAnnonce.data;
        const villeConnue = VILLES.includes(a.ville);
        setAnnonce(a);
        setCategories(Array.isArray(resCategories.data) ? resCategories.data : []);
        setForm({
          titre: a.titre || '',
          categorie: a.categorie?._id || a.categorie || '',
          prix: String(a.prix ?? ''),
          ville: villeConnue ? a.ville : '__autre',
          villeAutre: villeConnue ? '' : a.ville || '',
          description: a.description || '',
        });
      })
      .catch((err) => {
        if (!annule) setErreurChargement(err.response?.status === 404 ? 'Cette annonce est introuvable ou a été supprimée.' : err.response?.data?.message || "Impossible de charger l'annonce");
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });

    return () => {
      annule = true;
    };
  }, [id]);

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    },
    []
  );

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

  // ----- Nouvelles photos -----
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

  const retirer = (pid) => {
    setPhotos((p) => {
      const cible = p.find((x) => x.id === pid);
      if (cible) URL.revokeObjectURL(cible.url);
      return p.filter((x) => x.id !== pid);
    });
  };

  const definirPrincipale = (pid) => {
    setPhotos((p) => {
      const cible = p.find((x) => x.id === pid);
      return cible ? [cible, ...p.filter((x) => x.id !== pid)] : p;
    });
  };

  const annulerNouvelles = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
  };

  // ----- Données dérivées -----
  const villeFinale = form.ville === '__autre' ? form.villeAutre.trim() : form.ville;
  const prixNombre = Number(form.prix);
  const categorieNom = categories.find((c) => c._id === form.categorie)?.nom || '';
  const anciennes = (annonce?.images || []).filter(Boolean);

  const proprietaire = !!annonce && !!user && String(annonce.utilisateur?._id || annonce.utilisateur) === String(user._id);
  const autorise = proprietaire || user?.role === 'admin';

  const modifie =
    !!annonce &&
    (form.titre.trim() !== (annonce.titre || '') ||
      form.description.trim() !== (annonce.description || '') ||
      prixNombre !== Number(annonce.prix) ||
      form.categorie !== (annonce.categorie?._id || annonce.categorie || '') ||
      villeFinale !== (annonce.ville || '') ||
      photos.length > 0);

  // ----- Envoi -----
  const valider = () => {
    const er = {};
    // Un champ non modifié n'est pas revalidé (les anciennes annonces restent modifiables)
    if (form.titre.trim() !== annonce.titre && form.titre.trim().length < 3) er.titre = 'Le titre doit contenir au moins 3 caractères';
    if (!form.titre.trim()) er.titre = 'Le titre est obligatoire';
    if (!form.categorie) er.categorie = 'Choisissez une catégorie';
    if (!(prixNombre > 0)) er.prix = 'Indiquez un prix supérieur à 0';
    if (!villeFinale) er.ville = form.ville === '__autre' ? 'Saisissez le nom de la ville' : 'Choisissez une ville';
    if (!form.description.trim()) er.description = 'La description est obligatoire';
    else if (form.description.trim() !== annonce.description && form.description.trim().length < 10) er.description = 'Décrivez votre article en au moins 10 caractères';
    return er;
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    if (envoi || !annonce) return;

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

      await api.put(`/annonces/${id}`, fd, {
        onUploadProgress: (ev) => {
          if (ev.total) setProgression(Math.round((ev.loaded * 100) / ev.total));
        },
      });
      setSucces(true);
    } catch (err) {
      showToast(err.response?.data?.message || "Erreur lors de la modification de l'annonce", 'err');
    } finally {
      setEnvoi(false);
    }
  };

  /* ---------- États de la page ---------- */
  if (chargement) {
    return (
      <div className="pa-root">
        <div className="ea-skel" style={{ height: 70, marginBottom: 18 }} />
        <div className="pa-layout">
          <div className="pa-form">
            <div className="ea-skel" style={{ height: 260 }} />
            <div className="ea-skel" style={{ height: 320 }} />
          </div>
          <div className="ea-skel" style={{ height: 420 }} />
        </div>
      </div>
    );
  }

  if (erreurChargement) {
    return (
      <div className="pa-root">
        <div className="pa-locked">
          <span className="emoji">🔍</span>
          <h3>Impossible de modifier cette annonce</h3>
          <p>{erreurChargement}</p>
          <Link to="/mes-annonces" className="pa-btn primary" style={{ display: 'inline-flex', padding: '13px 24px' }}>
            <span className="txt">Mes annonces</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!autorise) {
    return (
      <div className="pa-root">
        <div className="pa-locked">
          <span className="emoji">🔒</span>
          <h3>Accès refusé</h3>
          <p>Vous ne pouvez modifier que vos propres annonces.</p>
          <Link to="/" className="pa-btn primary" style={{ display: 'inline-flex', padding: '13px 24px' }}>
            <span className="txt">Retour à l'accueil</span>
          </Link>
        </div>
      </div>
    );
  }

  const etat = etatDe(annonce);
  const urlsApercu = photos.length > 0 ? photos.map((p) => p.url) : anciennes.map((img) => imageUrl(img));

  return (
    <div className="pa-root">
      {toast && <div className={`pa-toast ${toast.type}`}>{toast.text}</div>}

      <div className="pa-top">
        <button type="button" className="pa-back" onClick={() => navigate(-1)} aria-label="Retour">
          ←
        </button>
        <div>
          <h1>Modifier l'annonce</h1>
          <div className="ea-head-row">
            <span className={`ea-chip ${etat.cls}`}>{etat.label}</span>
            <span className="ea-chip vues">👁️ {annonce.vues || 0} vue{(annonce.vues || 0) > 1 ? 's' : ''}</span>
            <span style={{ fontSize: 13.5, color: '#64748b' }}>Mettez à jour les informations de votre annonce.</span>
          </div>
        </div>
      </div>

      <div className="pa-layout">
        <form className="pa-form" onSubmit={enregistrer} noValidate>
          {/* 1. Photos */}
          <section className="pa-card">
            <div className="pa-card-head">
              <span className="pa-step">1</span>
              <div>
                <h2>Photos</h2>
                <p>Ajoutez de nouvelles photos pour remplacer les actuelles.</p>
              </div>
            </div>

            <div className="ea-sub">Photos actuelles ({anciennes.length})</div>
            {anciennes.length > 0 ? (
              <div className={`pa-photos ea-old ${photos.length > 0 ? 'replaced' : ''}`}>
                {anciennes.map((img, idx) => (
                  <div key={`${img}-${idx}`} className={`pa-photo ${idx === 0 ? 'main' : ''}`}>
                    <img src={imageUrl(img)} alt={`Photo actuelle ${idx + 1}`} loading="lazy" />
                    {idx === 0 && photos.length === 0 && <span className="pa-main-tag">★ Principale</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="ea-none">Cette annonce n'a pas encore de photo.</div>
            )}

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
              <b>{photos.length > 0 ? `Nouvelles photos (${photos.length}/${MAX_PHOTOS})` : 'Remplacer les photos'}</b>
              <span>
                Glissez-déposez vos images ici ou <u>parcourez vos fichiers</u>
              </span>
              <span>JPG, PNG ou WebP · 5 Mo maximum par photo</span>
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={choisirFichiers} style={{ display: 'none' }} />

            {photos.length > 0 && (
              <>
                <div className="ea-notice warn">
                  <span>⚠️</span>
                  <span>Vos nouvelles photos remplaceront toutes les photos actuelles lorsque vous enregistrerez.</span>
                </div>
                <div className="pa-photos">
                  {photos.map((p, idx) => (
                    <div key={p.id} className={`pa-photo ${idx === 0 ? 'main' : ''}`}>
                      <img src={p.url} alt={`Nouvelle photo ${idx + 1}`} />
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
                    {photos.length} nouvelle{photos.length > 1 ? 's' : ''} photo{photos.length > 1 ? 's' : ''} sur {MAX_PHOTOS}
                  </span>
                  <button type="button" onClick={annulerNouvelles} style={{ border: 'none', background: 'none', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✕ Garder les photos actuelles
                  </button>
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
                Description détaillée <small>{form.description.length}/1000</small>
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

          {modifie && <div className="ea-dirty">Vous avez des modifications non enregistrées</div>}

          <div className="pa-submit">
            <button type="button" className="pa-btn ghost" onClick={() => navigate(-1)} disabled={envoi}>
              Annuler
            </button>
            <button type="submit" className="pa-btn primary" disabled={envoi || !modifie}>
              {envoi && <span className="fill" style={{ width: `${progression}%` }} />}
              <span className="txt">
                {envoi ? (
                  <>
                    <span className="pa-spin" /> Enregistrement… {progression}%
                  </>
                ) : modifie ? (
                  '💾 Enregistrer les modifications'
                ) : (
                  'Aucune modification'
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
                <PreviewSlides urls={urlsApercu} />
                {categorieNom && <span className="pa-pv-cat">{categorieNom}</span>}
              </div>
              <div className="pa-pv-body">
                <h4 className={`pa-pv-title ${form.titre.trim() ? '' : 'ph'}`}>{form.titre.trim() || "Le titre de l'annonce"}</h4>
                <p className={`pa-pv-price ${prixNombre > 0 ? '' : 'ph'}`}>{prixNombre > 0 ? fcfa(prixNombre) : '0 FCFA'}</p>
                <div className={`pa-pv-meta ${villeFinale ? '' : 'ph'}`}>
                  <span>📍 {villeFinale || 'Ville'}</span>
                  <span>{user?.prenom}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pa-tips">
            <h3 style={{ marginBottom: 10 }}>💡 Bon à savoir</h3>
            <ul>
              <li>Les changements sont visibles tout de suite sur l'accueil</li>
              <li>De nouvelles photos remplacent toutes les photos actuelles</li>
              <li>Le nombre de vues et le statut ne sont pas modifiés</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Succès */}
      {succes && (
        <div className="pa-overlay">
          <div className="pa-modal" role="dialog" aria-modal="true">
            <div className="pa-check">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3>Annonce modifiée !</h3>
            <p>Vos modifications ont bien été enregistrées.</p>
            <div className="pa-modal-actions">
              <button className="pa-btn primary" onClick={() => navigate(`/annonce/${id}`)}>
                <span className="txt">👁️ Voir mon annonce</span>
              </button>
              <button className="pa-btn soft" onClick={() => navigate('/mes-annonces')}>
                📋 Mes annonces
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditAnnonce;