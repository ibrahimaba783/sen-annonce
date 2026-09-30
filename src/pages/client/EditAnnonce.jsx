import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const EditAnnonce = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ titre: '', prix: '', categorie: '', ville: '', description: '' });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  useEffect(() => {
    Promise.all([api.get('/categories'), api.get(`/annonces/${id}`)])
      .then(([resCat, resAnn]) => {
        setCategories(resCat.data);
        const a = resAnn.data;
        setForm({
          titre: a.titre || '',
          prix: a.prix || '',
          categorie: a.categorie?._id || a.categorie || '',
          ville: a.ville || '',
          description: a.description || '',
        });
      })
      .catch(() => setErreur('Impossible de charger les données de l\'annonce'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setSucces('');
    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (images.length > 0) {
        images.forEach((img) => data.append('images', img));
      }

      await api.put(`/annonces/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSucces('Annonce modifiée avec succès !');
      setTimeout(() => navigate('/mes-annonces'), 1200);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page">Chargement...</div>;

  return (
    <div className="page">
      <h2>Modifier l'annonce</h2>
      {erreur && <div className="alert-error">{erreur}</div>}
      {succes && <div className="alert-success">{succes}</div>}

      <form onSubmit={handleSubmit} className="publish-form">
        <label>Titre de l'annonce</label>
        <input name="titre" value={form.titre} onChange={handleChange} required />

        <label>Catégorie</label>
        <select name="categorie" value={form.categorie} onChange={handleChange} required>
          <option value="">Sélectionner</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.nom}</option>
          ))}
        </select>

        <label>Prix (FCFA)</label>
        <input name="prix" type="number" value={form.prix} onChange={handleChange} required />

        <label>Localisation</label>
        <input name="ville" value={form.ville} onChange={handleChange} required />

        <label>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={4}
          required
        />

        <label>Nouvelles photos (optionnel, remplacera les actuelles)</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setImages(Array.from(e.target.files))}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
          <button type="button" className="btn-secondary" onClick={() => navigate('/mes-annonces')}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditAnnonce;
