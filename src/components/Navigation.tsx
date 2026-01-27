import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAroma } from '../context/AromaContext';
import { 
  Home, 
  Calendar, 
  Moon, 
  Coffee, 
  BarChart3, 
  MessageCircle
} from 'lucide-react';

interface NavItem {
  path: string;
  icon: React.ComponentType<any>;
  label: string;
}

const Navigation: React.FC = () => {
  const { currentTheme } = useAroma();

  const navItems: NavItem[] = [
    { path: '/', icon: Home, label: '홈' },
    { path: '/schedule', icon: Calendar, label: '근무표' },
    { path: '/sleep', icon: Moon, label: '수면' },
    { path: '/caffeine', icon: Coffee, label: '카페인' },
    { path: '/stats', icon: BarChart3, label: '인사이트' },
    { path: '/consultation', icon: MessageCircle, label: '설정' },
  ];

  return (
    <nav className="glass-effect" style={{ 
      borderTop: '1px solid rgba(255, 255, 255, 0.2)',
      position: 'sticky',
      bottom: 0,
      zIndex: 20,
      overflowX: 'auto'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 8px' }}>
        <div className="flex justify-between items-center" style={{ height: '64px', minWidth: 'max-content' }}>
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} style={{ marginBottom: '4px' }} />
              <span style={{ fontSize: '12px', fontWeight: 500, maxWidth: '48px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
              </span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;