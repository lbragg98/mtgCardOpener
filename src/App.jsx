import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Collection from './pages/Collection.jsx';
import Home from './pages/Home.jsx';
import PackOpening from './pages/PackOpening.jsx';
import PackSelection from './pages/PackSelection.jsx';
import SetSelection from './pages/SetSelection.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/sets" element={<SetSelection />} />
        <Route path="/packs/:setCode" element={<PackSelection />} />
        <Route path="/open/:setCode" element={<PackOpening />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
