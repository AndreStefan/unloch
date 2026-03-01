import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import CrisisOverlay from '../common/CrisisOverlay';
import OfflineBanner from '../common/OfflineBanner';
import { useCrisis } from '../../hooks/useCrisis';

export default function AppShell() {
  const { isCrisisActive } = useCrisis();

  return (
    <div className="min-h-dvh bg-cream flex flex-col">
      <OfflineBanner />
      {isCrisisActive && <CrisisOverlay />}
      <main className="flex-1 pb-20 max-w-lg mx-auto w-full">
        <Outlet />
      </main>
      {!isCrisisActive && <BottomNav />}
    </div>
  );
}
