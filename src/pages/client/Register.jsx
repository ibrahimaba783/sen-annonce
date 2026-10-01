import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SocialAuth from '../../components/SocialAuth';

const ROLES = [
  { value: 'client', icon: '🛍️', titre: 'Client', desc: 'Acheter et commander' },
  { value: 'vendeur', icon: '🏪', titre: 'Vendeur', desc: 'Publier des annonces' },
];

const Register = () => {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get('role') === 'vendeur' ? 'vendeur' : 'client');
  const [form, setForm] = useState({ nomComplet: '', email: '', telephone: '', motDePasse: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setLoading(true);

    const parts = form.nomComplet.trim().split(' ');
    const prenom = parts[0] || 'Utilisateur';
    const nom = parts.slice(1).join(' ') || ' ';

    try {
      await register({
        nom,
        prenom,
        email: form.email,
        telephone: form.telephone,
        motDePasse: form.motDePasse,
        role,
      });
      navigate('/');
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Créer un compte</h1>
        <p className="subtitle">Rejoignez notre communauté</p>

        {erreur && <div className="alert-error">{erreur}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Choix du type de compte */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Je suis :</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ROLES.map((r) => {
                const actif = role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    aria-pressed={actif}
                    style={{
                      padding: '12px 8px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'center',
                      border: actif ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: actif ? '#eff6ff' : 'white',
                      color: actif ? '#1d4ed8' : '#475569',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ fontSize: 22 }}>{r.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.titre}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{r.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="input-group">
            <span className="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <input
              name="nomComplet"
              placeholder="Nom complet"
              value={form.nomComplet}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <span className="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </span>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <span className="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />
              </svg>
            </span>
            <input
              name="telephone"
              type="tel"
              placeholder="Téléphone"
              value={form.telephone}
              onChange={handleChange}
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
              name="motDePasse"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              value={form.motDePasse}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Inscription...' : role === 'vendeur' ? "S'inscrire comme vendeur" : "S'inscrire comme client"}
          </button>
        </form>

        <SocialAuth role={role} label="ou s'inscrire avec" />

        <p className="auth-footer" style={{ marginTop: 24 }}>
          Déjà un compte ? <Link to="/connexion">Se connecter</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;