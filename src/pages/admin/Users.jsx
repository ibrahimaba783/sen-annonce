import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const LIBELLES = { client: 'Client', vendeur: 'Vendeur', admin: 'Admin' };
const FILTRES = [
  { cle: 'tous', label: 'Tous' },
  { cle: 'client', label: 'Clients' },
  { cle: 'vendeur', label: 'Vendeurs' },
  { cle: 'admin', label: 'Admins' },
];

const roleAffiche = (r) => (r === 'prestataire' ? 'vendeur' : r);
const initiales = (u) => `${u.prenom?.[0] || ''}${u.nom?.[0] || ''}`.toUpperCase() || '?';
const teinte = (s = '') => [...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const sansAccent = (s = '') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const Users = () => {
  const { user: moi } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [contact, setContact] = useState(null); // utilisateur à contacter
  const [form, setForm] = useState({ sujet: '', message: '' });
  const [envoi, setEnvoi] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [filtreRole, setFiltreRole] = useState('tous');

  const charger = () =>
    api
      .get('/admin/utilisateurs')
      .then((res) => setUsers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    charger();
  }, []);

  const afficher = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const toggleBloquer = async (u) => {
    const action = u.isBlocked ? 'débloquer' : 'bloquer';
    if (!window.confirm(`Voulez-vous ${action} ${u.prenom} ${u.nom} ?`)) return;
    try {
      await api.patch(`/admin/utilisateurs/${u._id}/bloquer`);
      afficher('ok', `Compte ${u.isBlocked ? 'débloqué' : 'bloqué'}. La personne et les autres admins ont été prévenus.`);
      charger();
    } catch (err) {
      afficher('err', err.response?.data?.message || "Erreur lors de l'opération");
    }
  };

  const changerRole = async (u, role) => {
    if (!window.confirm(`Changer le rôle de ${u.prenom} ${u.nom} en « ${LIBELLES[role]} » ?`)) return;
    try {
      await api.patch(`/admin/utilisateurs/${u._id}/role`, { role });
      afficher('ok', `Rôle modifié en « ${LIBELLES[role]} ». La personne et les autres admins ont été prévenus.`);
      charger();
    } catch (err) {
      afficher('err', err.response?.data?.message || 'Erreur lors du changement de rôle');
    }
  };

  const ouvrirContact = (u) => {
    setContact(u);
    setForm({ sujet: '', message: '' });
  };

  const envoyer = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    try {
      await api.post(`/admin/utilisateurs/${contact._id}/contacter`, form);
      afficher('ok', `Message envoyé à ${contact.prenom} ${contact.nom}.`);
      setContact(null);
    } catch (err) {
      afficher('err', err.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setEnvoi(false);
    }
  };

  const comptes = useMemo(() => {
    const c = { tous: users.length, client: 0, vendeur: 0, admin: 0 };
    users.forEach((u) => {
      const r = roleAffiche(u.role);
      if (c[r] !== undefined) c[r] += 1;
    });
    return c;
  }, [users]);

  const affiches = useMemo(() => {
    const q = sansAccent(recherche.trim());
    return users.filter((u) => {
      if (filtreRole !== 'tous' && roleAffiche(u.role) !== filtreRole) return false;
      if (q && !sansAccent(`${u.prenom} ${u.nom} ${u.email}`).includes(q)) return false;
      return true;
    });
  }, [users, recherche, filtreRole]);

  return (
    <div className="page">
      {feedback && <div className={`ad-toast ${feedback.type}`}>{feedback.text}</div>}

      {/* Outils : recherche + filtres */}
      <div className="ad-toolbar">
        <div className="ad-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un nom ou un email..." aria-label="Rechercher un utilisateur" />
          {recherche && (
            <button type="button" onClick={() => setRecherche('')} aria-label="Effacer">
              ✕
            </button>
          )}
        </div>
        <div className="ad-chips">
          {FILTRES.map((f) => (
            <button key={f.cle} type="button" className={`ad-chip ${filtreRole === f.cle ? 'on' : ''}`} onClick={() => setFiltreRole(f.cle)}>
              {f.label} <b>{comptes[f.cle]}</b>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="ad-skel-list">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="ad-skel" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {affiches.map((u) => {
                const estMoi = moi && u._id === moi._id;
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="ad-person">
                        <span className="ad-av" style={{ background: `linear-gradient(135deg, hsl(${teinte(u._id)} 75% 55%), hsl(${(teinte(u._id) + 40) % 360} 70% 42%))` }}>
                          {initiales(u)}
                        </span>
                        <span className="ad-person-name">
                          {u.prenom} {u.nom}
                          {estMoi && <em className="ad-me">vous</em>}
                        </span>
                      </div>
                    </td>
                    <td className="ad-muted">{u.email}</td>
                    <td>
                      <select value={roleAffiche(u.role)} disabled={estMoi} onChange={(e) => changerRole(u, e.target.value)}>
                        <option value="client">Client</option>
                        <option value="vendeur">Vendeur</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${u.isBlocked ? 'badge-off' : 'badge-online'}`}>{u.isBlocked ? 'Bloqué' : 'Actif'}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {!estMoi && (
                        <div className="ad-actions">
                          <button type="button" className="ad-btn" onClick={() => ouvrirContact(u)}>
                            ✉️ Contacter
                          </button>
                          <button type="button" className={`ad-btn ${u.isBlocked ? 'ok' : 'danger'}`} onClick={() => toggleBloquer(u)}>
                            {u.isBlocked ? '🔓 Débloquer' : '🚫 Bloquer'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {affiches.length === 0 && (
            <p className="empty-state" style={{ marginTop: 16 }}>
              Aucun utilisateur ne correspond à votre recherche.
            </p>
          )}
        </div>
      )}

      {contact && (
        <div className="ad-modal-bg" onClick={() => setContact(null)}>
          <form className="ad-modal" onClick={(e) => e.stopPropagation()} onSubmit={envoyer}>
            <div className="ad-modal-head">
              <span className="ad-av" style={{ background: `linear-gradient(135deg, hsl(${teinte(contact._id)} 75% 55%), hsl(${(teinte(contact._id) + 40) % 360} 70% 42%))` }}>
                {initiales(contact)}
              </span>
              <div>
                <h3>Contacter {contact.prenom} {contact.nom}</h3>
                <p>{contact.email}</p>
              </div>
            </div>
            <input placeholder="Sujet" value={form.sujet} onChange={(e) => setForm({ ...form, sujet: e.target.value })} required />
            <textarea placeholder="Votre message..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
            <div className="ad-hint">La personne recevra le message dans sa messagerie et une notification.</div>
            <div className="ad-modal-actions">
              <button type="button" className="ad-btn" onClick={() => setContact(null)}>
                Annuler
              </button>
              <button type="submit" className="btn-primary" disabled={envoi}>
                {envoi ? 'Envoi...' : 'Envoyer ➤'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Users;