import { useEffect, useState } from 'react';
import api from '../../api/axios';

const SignalementsAdmin = () => {
  const [signalements, setSignalements] = useState([]);
  const [loading, setLoading] = useState(true);

  const charger = () => {
    api.get('/admin/signalements')
      .then((res) => setSignalements(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    charger();
  }, []);

  const validerEtIgnorer = async (id) => {
    await api.patch(`/admin/annonces/${id}/valider`);
    charger();
  };

  const supprimerAnnonce = async (id) => {
    if (!window.confirm('Supprimer définitivement cette annonce signalée ?')) return;
    await api.delete(`/admin/annonces/${id}`);
    charger();
  };

  if (loading) return <div className="page">Chargement des signalements...</div>;

  return (
    <div className="page">
      <h2>Annonces Signalées (Modération)</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Titre</th>
            <th>Vendeur</th>
            <th>Nombre de signalements</th>
            <th>Statut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {signalements.map((a) => (
            <tr key={a._id}>
              <td>{a.titre}</td>
              <td>{a.utilisateur?.prenom} {a.utilisateur?.nom} ({a.utilisateur?.email})</td>
              <td><span className="text-danger" style={{ fontWeight: 'bold' }}>🚩 {a.signalements}</span></td>
              <td>{a.statut}</td>
              <td style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => validerEtIgnorer(a._id)} style={{ color: 'var(--success)' }}>
                  Approuver & Ignorer
                </button>
                <button onClick={() => supprimerAnnonce(a._id)} className="text-danger">
                  Supprimer l'annonce
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {signalements.length === 0 && (
        <p className="empty-state" style={{ marginTop: 20 }}>Aucun signalement en attente de modération.</p>
      )}
    </div>
  );
};

export default SignalementsAdmin;
