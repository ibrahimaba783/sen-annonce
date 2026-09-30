import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const ForgotPassword = () => {
  const [identifiant, setIdentifiant] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setErreur('');
    setLoading(true);
    try {
      const res = await api.post('/auth/mot-de-passe-oublie', { email: identifiant });
      setMessage(res.data.message || 'Un lien de réinitialisation a été envoyé si le compte existe.');
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Mot de passe oublié</h1>

        {/* Lock Icon Badge */}
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
          Entrez votre email ou téléphone pour<br />réinitialiser votre mot de passe.
        </p>

        {erreur && <div className="alert-error">{erreur}</div>}
        {message && <div className="alert-success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <span className="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Email ou téléphone"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: 24 }}>
          <Link to="/connexion">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;