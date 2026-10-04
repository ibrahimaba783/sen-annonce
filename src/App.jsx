import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

import RoleLayout from './layouts/RoleLayout';
import AdminLayout from './layouts/AdminLayout';

import Home from './pages/client/Home';
import ChooseRole from './pages/client/ChooseRole';
import Login from './pages/client/Login';
import Register from './pages/client/Register';
import RegisterVendeur from './pages/client/RegisterVendeur';
import ForgotPassword from './pages/client/ForgotPassword';
import ResetPassword from './pages/client/ResetPassword';
import Search from './pages/client/Search';
import Categories from './pages/client/Categories';
import AnnonceDetail from './pages/client/AnnonceDetail';
import PublishAnnonce from './pages/client/PublishAnnonce';
import EditAnnonce from './pages/client/EditAnnonce';
import MyAnnonces from './pages/client/MyAnnonces';
import Messages from './pages/client/Messages';
import Conversation from './pages/client/Conversation';
import Profile from './pages/client/Profile';
import ProfileInfos from './pages/client/ProfileInfos';
import Parametres from './pages/client/Parametres';
import Notifications from './pages/client/Notifications';
import Favoris from './pages/client/Favoris';

import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import AnnoncesAdmin from './pages/admin/AnnoncesAdmin';
import CategoriesAdmin from './pages/admin/CategoriesAdmin';
import SignalementsAdmin from './pages/admin/SignalementsAdmin';
import { Confidentialite, SuppressionDonnees } from './pages/client/Legal';

import './index.css';

const NotFound = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#f4f6fb', textAlign: 'center', padding: 24 }}>
    <div style={{ fontSize: 64 }}>🔍</div>
    <h1 style={{ margin: 0, color: '#0f172a' }}>Page introuvable</h1>
    <p style={{ margin: 0, color: '#64748b' }}>La page que vous cherchez n'existe pas ou a été déplacée.</p>
    <Link to="/" style={{ marginTop: 8, background: '#2563eb', color: 'white', padding: '10px 22px', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}>
      Retour à l'accueil
    </Link>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/demarrage" element={<Navigate to="/" replace />} />
          <Route path="/rejoindre" element={<ChooseRole />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          <Route path="/inscription-prestataire" element={<RegisterVendeur />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
          <Route path="/reinitialiser-mot-de-passe/:token" element={<ResetPassword />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/suppression-donnees" element={<SuppressionDonnees />} />
          <Route path="/conversation/:contactId" element={<PrivateRoute><Conversation /></PrivateRoute>} />

          <Route element={<RoleLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/recherche" element={<Search />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/annonce/:id" element={<AnnonceDetail />} />
            <Route path="/annonce/modifier/:id" element={<PrivateRoute><EditAnnonce /></PrivateRoute>} />
            <Route path="/favoris" element={<PrivateRoute><Favoris /></PrivateRoute>} />
            <Route path="/publier" element={<PrivateRoute><PublishAnnonce /></PrivateRoute>} />
            <Route path="/mes-annonces" element={<PrivateRoute><MyAnnonces /></PrivateRoute>} />
            <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
            <Route path="/profil" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/profil/infos" element={<PrivateRoute><ProfileInfos /></PrivateRoute>} />
            <Route path="/parametres" element={<PrivateRoute><Parametres /></PrivateRoute>} />
            <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
          </Route>

          <Route element={<PrivateRoute adminOnly><AdminLayout /></PrivateRoute>}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/utilisateurs" element={<Users />} />
            <Route path="/admin/annonces" element={<AnnoncesAdmin />} />
            <Route path="/admin/categories" element={<CategoriesAdmin />} />
            <Route path="/admin/signalements" element={<SignalementsAdmin />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;