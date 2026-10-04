import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setErreur('');

    if (motDePasse.length < 6) {
      return setErreur('Le mot de passe doit contenir au moins 6 caractères');
    }
    if (motDePasse !== confirmation) {
      return setErreur('Les deux mots de passe ne correspondent pas');
    }

    setLoading(true);
    try {
      const res = await api.post(`/auth/reinitialiser-mot-de-passe/${token}`, {
        nouveauMotDePasse: motDePasse,
      });
      setMessage(res.data.message || 'Mot de passe modifié avec succès');
      setTimeout(() => navigate('/connexion'), 2000);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Nouveau mot de passe</h1>

        <div style={{
          width: 72,
          height: 72,
          background: '#eef2ff',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '16px auto 20px',
          color: '#1d4ed8'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <p className="subtitle" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
          Choisissez un nouveau mot de passe<br />pour votre compte.
        </p>

        {erreur && <div className="alert-error">{erreur}</div>}
        {message && <div className="alert-success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <span className="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <span className="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Enregistrement...' : 'Modifier le mot de passe'}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: 24 }}>
          <Link to="/connexion">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;