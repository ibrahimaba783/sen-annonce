import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { categoryIcon } from '../../api/categoryIcon';

const CategoriesAdmin = () => {
  const [categories, setCategories] = useState([]);
  const [nom, setNom] = useState('');

  const charger = () => api.get('/categories').then((res) => setCategories(res.data));

  useEffect(() => { charger(); }, []);

  const ajouter = async (e) => {
    e.preventDefault();
    if (!nom.trim()) return;
    await api.post('/categories', { nom, icone: categoryIcon(nom) });
    setNom('');
    charger();
  };

  const supprimer = async (id) => {
    if (!window.confirm('Supprimer cette catégorie ?')) return;
    await api.delete(`/categories/${id}`);
    charger();
  };

  return (
    <div className="page">
      <h2>Catégories</h2>

      <form onSubmit={ajouter} className="category-form">
        <input
          placeholder="Nom de la catégorie"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary">Ajouter</button>
      </form>

      <div className="categories-admin-list">
        {categories.map((c) => (
          <div key={c._id} className="category-admin-item">
            <span>{categoryIcon(c.nom)} {c.nom}</span>
            <button onClick={() => supprimer(c._id)} className="text-danger">Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesAdmin;