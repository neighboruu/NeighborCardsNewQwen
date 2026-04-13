import { Routes, Route } from 'react-router-dom';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import SwipeCards from './pages/SwipeCards';
import Review from './pages/Review';
import SubtitleUpload from './pages/SubtitleUpload';
import { useUserStore } from './store/user-store.js';

function AppContent() {
  const { userName, isSessionActive } = useUserStore();
  
  if (userName === null && !isSessionActive) {
    return <Onboarding />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/learn" element={<SwipeCards />} />
      <Route path="/review" element={<Review />} />
      <Route path="/subtitles" element={<SubtitleUpload />} />
    </Routes>
  );
}

function App() {
  return <AppContent />;
}

export default App;
