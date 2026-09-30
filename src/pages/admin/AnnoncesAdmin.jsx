import { useEffect, useState } from 'react';
import api from '../../api/axios';

const AnnoncesAdmin = () => {
  const [annonces, setAnnonces] = useState([]);

  const charger = () => api.get('/admin/annonces').then((res) => setAnnonces(res.data));

  useEffect(() => { charger(); }, []);

  const valider = async (id) => {
    await api.patch(`/admin/annonces/${id}/valider`);
    charger();
  };

  const supprimer = async (id) => {
    if (!window.confirm('Supprimer cette annonce ?')) return;
    await api.delete(`/admin/annonces/${id}`);
    charger();
  };

  const statutBadge = (statut) => {
    if (statut === 'en_attente') return <span className="badge badge-pending">En attente</span>;
    if (statut === 'refusee') return <span className="badge badge-off">Refusée</span>;
    return <span className="badge badge-online">Validée</span>;
  };

  return (
    <div className="page">
      <h2>Annonces</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Titre</th>
            <th>Prix</th>
            <th>Catégorie</th>
            <th>Vendeur</th>
            <th>Statut</th>
            <th>Signalements</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {annonces.map((a) => (
            <tr key={a._id}>
              <td>{a.titre}</td>
              <td>{a.prix.toLocaleString()} FCFA</td>
              <td>{a.categorie?.nom}</td>
              <td>{a.utilisateur?.prenom} {a.utilisateur?.nom}</td>
              <td>{statutBadge(a.statut)}</td>
              <td>{a.signalements > 0 ? <span className="text-danger">{a.signalements}</span> : '—'}</td>
              <td>
                {a.statut === 'en_attente' && (
                  <button onClick={() => valider(a._id)} style={{ color: 'var(--success)' }}>Valider</button>
                )}
                <button onClick={() => supprimer(a._id)} className="text-danger">Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AnnoncesAdmin;