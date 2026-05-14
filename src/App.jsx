import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SupabaseSetupError from './components/SupabaseSetupError.jsx';
import { isSupabaseConfigured } from './lib/supabaseClient.js';
import BattleDeckBuilder from './pages/BattleDeckBuilder.jsx';
import BattleHome from './pages/BattleHome.jsx';
import BattlePlay from './pages/BattlePlay.jsx';
import BinderDetail from './pages/BinderDetail.jsx';
import Binders from './pages/Binders.jsx';
import Collection from './pages/Collection.jsx';
import Duplicates from './pages/Duplicates.jsx';
import Friends from './pages/Friends.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import PackOpening from './pages/PackOpening.jsx';
import PackSelection from './pages/PackSelection.jsx';
import SetSelection from './pages/SetSelection.jsx';
import Shop from './pages/Shop.jsx';
import Showcase from './pages/Showcase.jsx';
import Signup from './pages/Signup.jsx';
import TradeDetail from './pages/TradeDetail.jsx';
import TradeNew from './pages/TradeNew.jsx';
import Trades from './pages/Trades.jsx';

export default function App() {
  console.info('App mounted.');

  if (!isSupabaseConfigured) {
    return <SupabaseSetupError />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/sets" element={<SetSelection />} />
        <Route path="/packs/:setCode" element={<PackSelection />} />
        <Route path="/open/:setCode" element={<PackOpening />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/duplicates" element={<Duplicates />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/shop" element={<Shop />} />
          <Route path="/binders" element={<Binders />} />
          <Route path="/binders/:binderId" element={<BinderDetail />} />
          <Route path="/showcase" element={<Showcase />} />
          <Route path="/battle" element={<BattleHome />} />
          <Route path="/battle/deck-builder" element={<BattleDeckBuilder />} />
          <Route path="/battle/play" element={<BattlePlay />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/trades/new/:friendId" element={<TradeNew />} />
          <Route path="/trades/:tradeId" element={<TradeDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
