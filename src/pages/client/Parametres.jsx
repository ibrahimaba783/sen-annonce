import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const Parametres = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setSucces('');

    if (form.nouveauMotDePasse !== form.confirmation) {
      return setErreur('Les nouveaux mots de passe ne correspondent pas.');
    }

    setLoading(true);
    try {
      await api.put('/auth/changement-mot-de-passe', {
        ancienMotDePasse: form.ancienMotDePasse,
        nouveauMotDePasse: form.nouveauMotDePasse,
      });
      setSucces('Mot de passe changé avec succès !');
      setForm({ ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' });
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="detail-header">
        <button onClick={() => navigate('/profil')}>←</button>
        <h2>Paramètres du compte</h2>
      </div>

      <div className="publish-form" style={{ marginTop: 20 }}>
        <h4>Statut du compte</h4>
        <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 20 }}>
          <p><strong>Type de compte :</strong> {user?.role === 'prestataire' ? 'Prestataire / Vendeur' : user?.role === 'admin' ? 'Administrateur' : 'Acheteur / Client'}</p>
          <p><strong>Statut de vérification :</strong> <span className="badge badge-online">Compte vérifié</span></p>
        </div>

        <h4>Changer le mot de passe</h4>
        {erreur && <div className="alert-error">{erreur}</div>}
        {succes && <div className="alert-success">{succes}</div>}

        <form onSubmit={handleSubmit}>
          <label>Ancien mot de passe</label>
          <input
            type="password"
            name="ancienMotDePasse"
            value={form.ancienMotDePasse}
            onChange={handleChange}
            required
          />

          <label>Nouveau mot de passe</label>
          <input
            type="password"
            name="nouveauMotDePasse"
            value={form.nouveauMotDePasse}
            onChange={handleChange}
            required
          />

          <label>Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            name="confirmation"
            value={form.confirmation}
            onChange={handleChange}
            required
          />

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 15 }}>
            {loading ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Parametres;
