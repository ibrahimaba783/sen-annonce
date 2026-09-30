import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { imageUrl } from '../../api/imageUrl';
import { useAuth } from '../../context/AuthContext';
import './Conversation.css';

/* ---------- Utilitaires d'affichage ---------- */
const memeJour = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

const libelleJour = (date) => {
  const d = new Date(date);
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);
  if (memeJour(d, new Date())) return "Aujourd'hui";
  if (memeJour(d, hier)) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const heure = (date) => new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const idExpediteur = (m) => m.expediteur?._id || m.expediteur;

const Conversation = () => {
  const { contactId } = useParams();
  const [searchParams] = useSearchParams();
  const annonceId = searchParams.get('annonce');
  const [contactInfo, setContactInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [photoErreur, setPhotoErreur] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const bottomRef = useRef(null);

  useEffect(() => {
    // Charger infos du contact
    api.get(`/auth/vendeur/${contactId}`).then((res) => {
      setContactInfo(res.data);
    }).catch(() => {});
  }, [contactId]);

  const chargerMessages = () => {
    api.get(`/messages/${contactId}`).then((res) => setMessages(res.data));
  };

  useEffect(() => {
    chargerMessages();
    const interval = setInterval(chargerMessages, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const envoyer = async (e) => {
    e.preventDefault();
    if (!texte.trim()) return;
    const currentText = texte;
    setTexte('');
    await api.post('/messages', { recepteur: contactId, contenu: currentText, annonce: annonceId });
    chargerMessages();
  };

  const nomComplet = contactInfo ? `${contactInfo.prenom} ${contactInfo.nom}` : 'Utilisateur';
  const initiales = contactInfo
    ? `${contactInfo.prenom?.[0] || ''}${contactInfo.nom?.[0] || ''}`.toUpperCase()
    : 'U';
  const photo = contactInfo?.photo ? imageUrl(contactInfo.photo) : null;

  return (
    <div className="cv-root">
      {/* En-tête */}
      <header className="cv-header">
        <div className="cv-header-in">
          <button className="cv-icon-btn" onClick={() => navigate(-1)} aria-label="Retour">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="cv-avatar-wrap">
            {photo && !photoErreur ? (
              <img className="cv-avatar" src={photo} alt={nomComplet} onError={() => setPhotoErreur(true)} />
            ) : (
              <div className="cv-avatar" aria-hidden="true">{initiales}</div>
            )}
            <span className="cv-dot" />
          </div>

          <div className="cv-who">
            <h4 className="cv-name">{nomComplet}</h4>
            <span className="cv-status">En ligne</span>
          </div>

          <button className="cv-icon-btn" aria-label="Plus d'options">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
            </svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="cv-body">
        <div className="cv-thread">
          {messages.length === 0 && (
            <div className="cv-empty">
              <span className="emoji">👋</span>
              <h3>Commencez la conversation</h3>
              <p>Envoyez un premier message à {contactInfo?.prenom || 'ce contact'}.</p>
            </div>
          )}

          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const isMe = idExpediteur(m) === user._id;

            const nouveauJour = !prev || !memeJour(prev.createdAt, m.createdAt);
            const memeGroupeAvant =
              prev && !nouveauJour && idExpediteur(prev) === idExpediteur(m) &&
              new Date(m.createdAt) - new Date(prev.createdAt) < 5 * 60 * 1000;
            const memeGroupeApres =
              next && memeJour(next.createdAt, m.createdAt) && idExpediteur(next) === idExpediteur(m) &&
              new Date(next.createdAt) - new Date(m.createdAt) < 5 * 60 * 1000;

            return (
              <div key={m._id} style={{ display: 'contents' }}>
                {nouveauJour && (
                  <div className="cv-day"><span>{libelleJour(m.createdAt)}</span></div>
                )}
                <div
                  className={[
                    'cv-row',
                    isMe ? 'me' : 'them',
                    memeGroupeAvant ? 'cont' : '',
                    memeGroupeApres ? '' : 'end',
                  ].join(' ').trim()}
                >
                  <div className="cv-bubble">
                    <p>{m.contenu}</p>
                    <span className="cv-time">{heure(m.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Zone de saisie */}
      <form className="cv-composer" onSubmit={envoyer}>
        <div className="cv-composer-in">
          <button type="button" className="cv-attach" onClick={() => alert('Joindre une photo...')} aria-label="Joindre une photo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>

          <input
            className="cv-input"
            placeholder="Écrire un message..."
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            aria-label="Votre message"
          />

          <button type="submit" className="cv-send" disabled={!texte.trim()} aria-label="Envoyer">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.5 20.5 22 12 2.5 3.5l.01 6.6L15 12 2.51 13.9z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Conversation;