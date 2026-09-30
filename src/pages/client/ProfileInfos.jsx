import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import { useAuth } from '../../context/AuthContext';
import './ProfileInfos.css';

const LIBELLES_ROLES = { client: 'Client', vendeur: 'Vendeur', prestataire: 'Vendeur', admin: 'Administrateur' };
const TYPES_OK = ['image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX = 2 * 1024 * 1024; // 2 Mo
const MDP_MIN = 6;

const NIVEAUX = [
  { label: 'Trop court', couleur: '#ef4444' },
  { label: 'Faible', couleur: '#f97316' },
  { label: 'Moyen', couleur: '#eab308' },
  { label: 'Bon', couleur: '#3b82f6' },
  { label: 'Excellent', couleur: '#16a34a' },
];

// Force du mot de passe : 0 (trop court) à 4 (excellent)
const forceMotDePasse = (mdp) => {
  if (mdp.length < MDP_MIN) return 0;
  let score = 1;
  if (mdp.length >= 10) score++;
  if (/[A-Z]/.test(mdp) && /[a-z]/.test(mdp)) score++;
  if (/\d/.test(mdp)) score++;
  if (/[^A-Za-z0-9]/.test(mdp)) score++;
  return Math.min(score, 4);
};

const icone = (children) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const IconUser = () => icone(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>);
const IconPhone = () => icone(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />);
const IconMail = () => icone(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>);
const IconLock = () => icone(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>);
const IconEye = () => icone(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></>);
const IconEyeOff = () => icone(<><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>);
const IconCamera = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ProfileInfos = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const timerRef = useRef(null);

  const base = {
    prenom: user?.prenom || '',
    nom: (user?.nom || '').trim(),
    telephone: user?.telephone || '',
  };

  const [form, setForm] = useState(base);
  const [fichier, setFichier] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [imgErreur, setImgErreur] = useState(false);
  const [toast, setToast] = useState(null);

  // Changement de mot de passe
  const [mdp, setMdp] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [voirMdp, setVoirMdp] = useState(false);
  const [changing, setChanging] = useState(false);

  const showToast = useCallback((text, type = 'ok') => {
    setToast({ text, type });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Resynchronise le formulaire quand les infos du compte changent
  useEffect(() => {
    setForm({ prenom: base.prenom, nom: base.nom, telephone: base.telephone });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.prenom, user?.nom, user?.telephone]);

  // Aperçu de la nouvelle photo avant enregistrement
  useEffect(() => {
    if (!fichier) {
      setApercu(null);
      return undefined;
    }
    const url = URL.createObjectURL(fichier);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  // Une nouvelle photo enregistrée doit pouvoir s'afficher de nouveau
  useEffect(() => {
    setImgErreur(false);
  }, [user?.photo]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onChangeMdp = (e) => setMdp({ ...mdp, [e.target.name]: e.target.value });

  const choisirPhoto = (e) => {
    const f = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!f) return;
    if (!TYPES_OK.includes(f.type)) {
      showToast('Format non accepté : utilisez une image JPG, PNG ou WebP', 'err');
      return;
    }
    if (f.size > TAILLE_MAX) {
      showToast('Image trop lourde : 2 Mo maximum', 'err');
      return;
    }
    setFichier(f);
  };

  const annulerPhoto = () => setFichier(null);

  const supprimerPhoto = async () => {
    if (!window.confirm('Supprimer votre photo de profil ?')) return;
    setRemoving(true);
    try {
      const { data } = await api.delete('/auth/profil/photo');
      updateUser(data);
      setFichier(null);
      showToast('Photo supprimée');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la suppression', 'err');
    } finally {
      setRemoving(false);
    }
  };

  const infosModifiees =
    form.prenom.trim() !== base.prenom || form.nom.trim() !== base.nom || form.telephone.trim() !== base.telephone;
  const modifie = infosModifiees || !!fichier;

  const annulerTout = () => {
    setForm({ prenom: base.prenom, nom: base.nom, telephone: base.telephone });
    setFichier(null);
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    const prenom = form.prenom.trim();
    const nom = form.nom.trim();
    const telephone = form.telephone.trim();

    if (!prenom || !nom) return showToast('Le prénom et le nom sont obligatoires', 'err');
    if (telephone && telephone.replace(/\D/g, '').length < 8) return showToast('Numéro de téléphone invalide', 'err');

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('prenom', prenom);
      fd.append('nom', nom);
      if (telephone) fd.append('telephone', telephone);
      if (fichier) fd.append('photo', fichier);

      const { data } = await api.put('/auth/profil', fd);
      updateUser(data);
      setFichier(null);
      showToast('Profil mis à jour ✓');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de la mise à jour', 'err');
    } finally {
      setSaving(false);
    }
  };

  // ----- Mot de passe -----
  const niveau = forceMotDePasse(mdp.nouveau);
  const confirmationRempli = mdp.confirmation.length > 0;
  const correspond = mdp.nouveau === mdp.confirmation;
  const mdpPret = mdp.ancien && mdp.nouveau && mdp.confirmation;

  const changerMotDePasse = async (e) => {
    e.preventDefault();

    if (!mdp.ancien || !mdp.nouveau || !mdp.confirmation) return showToast('Remplissez les trois champs', 'err');
    if (mdp.nouveau.length < MDP_MIN) return showToast(`Le nouveau mot de passe doit contenir au moins ${MDP_MIN} caractères`, 'err');
    if (mdp.nouveau === mdp.ancien) return showToast("Le nouveau mot de passe doit être différent de l'ancien", 'err');
    if (mdp.nouveau !== mdp.confirmation) return showToast('Les deux mots de passe ne correspondent pas', 'err');

    setChanging(true);
    try {
      await api.put('/auth/changement-mot-de-passe', {
        ancienMotDePasse: mdp.ancien,
        nouveauMotDePasse: mdp.nouveau,
      });
      setMdp({ ancien: '', nouveau: '', confirmation: '' });
      setVoirMdp(false);
      showToast('Mot de passe modifié avec succès 🔒');
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors du changement de mot de passe', 'err');
    } finally {
      setChanging(false);
    }
  };

  const initiales = `${(user?.prenom || '').trim()[0] || ''}${(user?.nom || '').trim()[0] || ''}`.toUpperCase() || '?';
  const srcPhoto = apercu || (user?.photo && !imgErreur ? imageUrl(user.photo) : null);
  const nomComplet = `${user?.prenom || ''} ${user?.nom || ''}`.trim();
  const membreDepuis = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  const champMdp = (name, label, placeholder, autoComplete) => (
    <div className="pi-field full">
      <label htmlFor={`pi-${name}`}>{label}</label>
      <div className="pi-input has-eye">
        <IconLock />
        <input
          id={`pi-${name}`}
          name={name}
          type={voirMdp ? 'text' : 'password'}
          value={mdp[name]}
          onChange={onChangeMdp}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="pi-eye"
          onClick={() => setVoirMdp((v) => !v)}
          aria-label={voirMdp ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
        >
          {voirMdp ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="pi-root">
      {toast && <div className={`pi-toast ${toast.type}`}>{toast.text}</div>}

      <div className="pi-top">
        <button className="pi-back" onClick={() => navigate(-1)} aria-label="Retour">
          ←
        </button>
        <div>
          <h1>Informations personnelles</h1>
          <p>Gérez votre photo, vos coordonnées et votre mot de passe</p>
        </div>
      </div>

      <div className="pi-layout">
        {/* Carte photo */}
        <aside className="pi-card pi-side">
          <div className="pi-cover" />
          <div className="pi-avatar-wrap">
            <button type="button" className="pi-avatar" onClick={() => fileRef.current?.click()} aria-label="Changer la photo de profil">
              {srcPhoto ? (
                <img
                  key={srcPhoto}
                  src={srcPhoto}
                  alt={nomComplet}
                  onError={() => {
                    if (!apercu) setImgErreur(true);
                  }}
                />
              ) : (
                <span>{initiales}</span>
              )}
              <span className="pi-avatar-overlay">
                <IconCamera size={22} />
                Changer
              </span>
            </button>
            <span className="pi-cam" onClick={() => fileRef.current?.click()} role="presentation">
              <IconCamera />
            </span>

            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={choisirPhoto} style={{ display: 'none' }} />

            {fichier && <div className="pi-pending">Nouvelle photo : cliquez sur « Enregistrer »</div>}

            <div className="pi-name">{nomComplet || 'Mon profil'}</div>
            <div className="pi-mail">{user?.email}</div>

            <div className="pi-chips">
              <span className="pi-chip">{LIBELLES_ROLES[user?.role] || 'Client'}</span>
              {user?.isVerified && <span className="pi-chip ok">✓ Vérifié</span>}
              {membreDepuis && <span className="pi-chip">Membre depuis {membreDepuis}</span>}
            </div>

            <div className="pi-photo-actions">
              <button type="button" className="pi-btn pi-btn-soft" onClick={() => fileRef.current?.click()}>
                <IconCamera /> {user?.photo || fichier ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
              {fichier && (
                <button type="button" className="pi-btn pi-btn-ghost" onClick={annulerPhoto}>
                  Annuler ce choix
                </button>
              )}
              {!fichier && user?.photo && (
                <button type="button" className="pi-btn pi-btn-danger" onClick={supprimerPhoto} disabled={removing}>
                  {removing ? 'Suppression...' : '🗑️ Supprimer la photo'}
                </button>
              )}
              <span className="pi-hint">JPG, PNG ou WebP · 2 Mo maximum</span>
            </div>
          </div>
        </aside>

        {/* Colonne de droite : informations + mot de passe */}
        <div className="pi-col">
          <form className="pi-card pi-form" onSubmit={enregistrer}>
            <h2>Vos informations</h2>
            <p className="sub">Ces informations sont visibles par les acheteurs et les vendeurs.</p>

            <div className="pi-grid">
              <div className="pi-field">
                <label htmlFor="pi-prenom">Prénom</label>
                <div className="pi-input">
                  <IconUser />
                  <input id="pi-prenom" name="prenom" value={form.prenom} onChange={onChange} placeholder="Votre prénom" autoComplete="given-name" />
                </div>
              </div>

              <div className="pi-field">
                <label htmlFor="pi-nom">Nom</label>
                <div className="pi-input">
                  <IconUser />
                  <input id="pi-nom" name="nom" value={form.nom} onChange={onChange} placeholder="Votre nom" autoComplete="family-name" />
                </div>
              </div>

              <div className="pi-field full">
                <label htmlFor="pi-tel">Téléphone</label>
                <div className="pi-input">
                  <IconPhone />
                  <input id="pi-tel" name="telephone" type="tel" value={form.telephone} onChange={onChange} placeholder="+221 77 000 00 00" autoComplete="tel" />
                </div>
              </div>

              <div className="pi-field full">
                <label htmlFor="pi-email">Email</label>
                <div className="pi-input">
                  <IconMail />
                  <input id="pi-email" value={user?.email || ''} disabled readOnly />
                </div>
                <span className="pi-note">
                  <IconLock /> L'adresse email ne peut pas être modifiée.
                </span>
              </div>
            </div>

            {modifie && <div className="pi-dirty">Vous avez des modifications non enregistrées</div>}

            <div className="pi-actions">
              <button type="button" className="pi-btn pi-btn-ghost" onClick={annulerTout} disabled={!modifie || saving}>
                Annuler
              </button>
              <button type="submit" className="pi-btn pi-btn-primary" disabled={!modifie || saving}>
                {saving ? (
                  <>
                    <span className="pi-spin" /> Enregistrement...
                  </>
                ) : (
                  'Enregistrer les modifications'
                )}
              </button>
            </div>
          </form>

          {/* Mot de passe */}
          <form className="pi-card pi-form pi-pass" onSubmit={changerMotDePasse}>
            <h2>Mot de passe</h2>
            <p className="sub">Choisissez un mot de passe d'au moins {MDP_MIN} caractères que vous n'utilisez nulle part ailleurs.</p>

            <div className="pi-grid">
              {champMdp('ancien', 'Mot de passe actuel', 'Votre mot de passe actuel', 'current-password')}
              {champMdp('nouveau', 'Nouveau mot de passe', 'Votre nouveau mot de passe', 'new-password')}

              {mdp.nouveau && (
                <div className="pi-field full">
                  <div className="pi-meter" aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => (
                      <span key={n} className={n <= niveau ? 'on' : ''} style={n <= niveau ? { background: NIVEAUX[niveau].couleur } : undefined} />
                    ))}
                  </div>
                  <span className="pi-meter-label" style={{ color: NIVEAUX[niveau].couleur }}>
                    {NIVEAUX[niveau].label}
                  </span>
                </div>
              )}

              {champMdp('confirmation', 'Confirmer le nouveau mot de passe', 'Retapez le nouveau mot de passe', 'new-password')}

              {confirmationRempli && (
                <div className="pi-field full">
                  <span className={`pi-match ${correspond ? 'ok' : 'ko'}`}>
                    {correspond ? '✓ Les mots de passe correspondent' : '✕ Les mots de passe ne correspondent pas'}
                  </span>
                </div>
              )}
            </div>

            <div className="pi-actions">
              <button type="submit" className="pi-btn pi-btn-primary" disabled={!mdpPret || changing}>
                {changing ? (
                  <>
                    <span className="pi-spin" /> Modification...
                  </>
                ) : (
                  '🔒 Changer le mot de passe'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


export default ProfileInfos;

