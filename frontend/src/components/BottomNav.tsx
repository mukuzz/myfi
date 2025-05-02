import { useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiList } from 'react-icons/fi';

const tabs = [
  { name: 'Home', path: '/', icon: <FiHome size={32} /> },
  { name: 'Transactions', path: '/transactions', icon: <FiList size={32} /> }
];

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed border-t border-border bg-secondary w-full bottom-0 h-[80px] z-20">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <div
              key={tab.name}
              onClick={(e) => {
                e.preventDefault();
                if (!isActive) {
                  navigate(tab.path, { replace: true });
                } else {
                  // scoll to top
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className={`flex-1 py-3 flex flex-col items-center justify-center focus:outline-none ${
                isActive ? 'accent-secondary-foreground' : 'text-muted-foreground'
              }`}
              aria-label={tab.name}
            >
              {tab.icon}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav; 