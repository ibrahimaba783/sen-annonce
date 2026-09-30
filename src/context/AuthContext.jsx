import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  // Le panier n'existe que pour les clients
  const fetchCartCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    let role = null;
    try {
      role = JSON.parse(localStorage.getItem('user') || 'null')?.role;
    } catch (e) {
      role = null;
    }
    if (!token || (role && role !== 'client')) {
      setCartCount(0);
      return;
    }
    try {
      const res = await api.get('/cart');
      const count = res.data?.articles?.reduce((acc, item) => acc + (item.quantite || 1), 0) || 0;
      setCartCount(count);
    } catch (err) {
      setCartCount(0);
    }
  }, []);

  const fetchUnreadCounts = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      setCartCount(0);
      return;
    }
    try {
      const [resMsg, resNotif] = await Promise.all([
        api.get('/messages/unread-count').catch(() => ({ data: { unreadCount: 0 } })),
        api.get('/notifications/unread-count').catch(() => ({ data: { unreadCount: 0 } })),
      ]);
      setUnreadMessages(resMsg.data?.unreadCount || 0);
      setUnreadNotifications(resNotif.data?.unreadCount || 0);
      fetchCartCount();
    } catch (err) {
      console.error(err);
    }
  }, [fetchCartCount]);

  // Vérification de la session au démarrage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      api
        .get('/auth/profil')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUnreadCounts();
      const interval = setInterval(fetchUnreadCounts, 5000);
      return () => clearInterval(interval);
    } else {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      setCartCount(0);
    }
  }, [user, fetchUnreadCounts]);

  const login = async (identifiant, motDePasse) => {
    const { data } = await api.post('/auth/connexion', { identifiant, motDePasse });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/inscription', payload);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const updateUser = (updatedUserData) => {
    const merged = { ...user, ...updatedUserData };
    setUser(merged);
    localStorage.setItem('user', JSON.stringify(merged));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setUnreadMessages(0);
    setUnreadNotifications(0);
    setCartCount(0);
  };

  const isClient = user && (user.role === 'client' || !user.role);
  const isVendeur = user && (user.role === 'vendeur' || user.role === 'prestataire' || user.role === 'admin');
  const isAdmin = user && user.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        updateUser,
        login,
        register,
        logout,
        loading,
        unreadMessages,
        unreadNotifications,
        cartCount,
        fetchCartCount,
        fetchUnreadCounts,
        isClient,
        isVendeur,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};