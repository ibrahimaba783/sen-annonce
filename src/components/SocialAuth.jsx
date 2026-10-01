import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './SocialAuth.css';

const GOOGLE_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FACEBOOK_ID = import.meta.env.VITE_FACEBOOK_APP_ID;
// Mets la version indiquée dans ton tableau de bord Meta si elle est plus récente
const FACEBOOK_VERSION = 'v23.0';

const scripts = {};
const chargerScript = (src) => {
  if (!scripts[src]) {
    scripts[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => {
        delete scripts[src];
        reject(new Error('Script bloqué'));
      };
      document.head.appendChild(s);
    });
  }
  return scripts[src];
};

const chargerFacebook = () => {
  if (window.FB) return Promise.resolve(window.FB);
  if (!scripts.facebook) {
    scripts.facebook = new Promise((resolve, reject) => {
      window.fbAsyncInit = () => {
        window.FB.init({ appId: FACEBOOK_ID, cookie: false, xfbml: false, version: FACEBOOK_VERSION });
        resolve(window.FB);
      };
      const s = document.createElement('script');
      s.src = 'https://connect.facebook.net/fr_FR/sdk.js';
      s.async = true;
      s.defer = true;
      s.onerror = () => {
        delete scripts.facebook;
        reject(new Error('Script bloqué'));
      };
      document.head.appendChild(s);
    });
  }
  return scripts.facebook;
};

const IconFacebook = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.97.93-1.97 1.89v2.26h3.34l-.53 3.49h-2.81V24C19.61 23.1 24 18.1 24 12.07z" />
  </svg>
);

// role : 'client' | 'vendeur' si le choix est déjà fait (page d'inscription), sinon on le demande aux nouveaux comptes
const SocialAuth = ({ role = null, label = 'ou continuer avec' }) => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const googleRef = useRef(null);
  const roleRef = useRef(role);
  const envoyerRef = useRef(null);

  const [busy, setBusy] = useState('');
  const [erreur, setErreur] = useState('');
  const [attente, setAttente] = useState(null);
  const [fbPret, setFbPret] = useState(false);

  roleRef.current = role;

  const terminer = useCallback(
    (data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      navigate('/');
    },
    [navigate, setUser]
  );

  const envoyer = useCallback(
    async (provider, payload, roleChoisi) => {
      setBusy(provider);
      setErreur('');
      try {
        const { data } = await api.post(`/auth/${provider}`, { ...payload, role: roleChoisi || undefined });
        if (data.nouveau) {
          setAttente({ provider, payload, profil: data.profil });
          return;
        }
        terminer(data);
      } catch (err) {
        setErreur(err.response?.data?.message || 'Connexion impossible, réessayez');
      } finally {
        setBusy('');
      }
    },
    [terminer]
  );

  envoyerRef.current = envoyer;

  // Bouton Google
  useEffect(() => {
    if (!GOOGLE_ID) return undefined;
    let annule = false;

    chargerScript('https://accounts.google.com/gsi/client')
      .then(() => {
        if (annule || !window.google?.accounts?.id || !googleRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_ID,
          callback: (rep) => envoyerRef.current('google', { credential: rep.credential }, roleRef.current),
        });
        googleRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          locale: 'fr',
          width: Math.min(400, Math.max(240, googleRef.current.offsetWidth || 320)),
        });
      })
      .catch(() => setErreur('Impossible de charger Google (un bloqueur de publicités peut en être la cause)'));

    return () => {
      annule = true;
    };
  }, []);

  // Chargement du SDK Facebook
  useEffect(() => {
    if (!FACEBOOK_ID) return undefined;
    let annule = false;
    chargerFacebook()
      .then(() => {
        if (!annule) setFbPret(true);
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, []);

  const connexionFacebook = () => {
    setErreur('');
    if (!window.FB) {
      setErreur('Facebook est en cours de chargement, réessayez dans un instant');
      return;
    }
    // FB.login doit être appelé directement depuis le clic
    window.FB.login(
      (rep) => {
        const token = rep?.authResponse?.accessToken;
        if (token) envoyerRef.current('facebook', { accessToken: token }, roleRef.current);
        else setErreur('Connexion Facebook annulée');
      },
      { scope: 'public_profile,email' }
    );
  };

  const choisirRole = (r) => {
    const { provider, payload } = attente;
    setAttente(null);
    envoyer(provider, payload, r);
  };

  if (!GOOGLE_ID && !FACEBOOK_ID) return null;

  return (
    <div className="sa-root">
      <div className="sa-sep">
        <span>{label}</span>
      </div>

      {erreur && (
        <div className="sa-error" role="alert">
          {erreur}
        </div>
      )}

      <div className={`sa-buttons ${busy ? 'busy' : ''}`}>
        {GOOGLE_ID && <div ref={googleRef} className="sa-google" />}
        {FACEBOOK_ID && (
          <button type="button" className="sa-fb" onClick={connexionFacebook} disabled={!fbPret || !!busy}>
            <IconFacebook /> Continuer avec Facebook
          </button>
        )}
      </div>

      {busy && (
        <div className="sa-busy">
          <span className="sa-spin" /> Connexion en cours…
        </div>
      )}

      {attente && (
        <div className="sa-overlay" onClick={() => setAttente(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="sa-emoji">👋</div>
            <h3>Bienvenue{attente.profil?.prenom ? ` ${attente.profil.prenom}` : ''} !</h3>
            <p>Vous créez votre compte avec {attente.profil?.email}. Comment allez-vous utiliser Annonces+ ?</p>
            <div className="sa-roles">
              <button type="button" className="sa-role" onClick={() => choisirRole('client')}>
                <span>🛍️</span>
                <b>Client</b>
                <small>Acheter et commander</small>
              </button>
              <button type="button" className="sa-role" onClick={() => choisirRole('vendeur')}>
                <span>🏪</span>
                <b>Vendeur</b>
                <small>Publier des annonces</small>
              </button>
            </div>
            <button type="button" className="sa-cancel" onClick={() => setAttente(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialAuth;