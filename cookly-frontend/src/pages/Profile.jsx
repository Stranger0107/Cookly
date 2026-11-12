import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { Button, Segmented } from '../components/ui';

export default function Profile() {
  useDocumentTitle('Profile');
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="page">
      <div className="page-head">
        <h1>Profile</h1>
      </div>
      <section className="bento">
        <div className="tile span-6 row-2" style={{ alignItems: 'flex-start', gap: 14 }}>
          <span className="avatar profile-avatar">{user.name.charAt(0).toUpperCase()}</span>
          <div>
            <h2>{user.name}</h2>
            <p className="muted">{user.email}</p>
          </div>
          <span className="badge badge--user">Member since {memberSince}</span>
        </div>

        <div className="tile span-6">
          <h3 style={{ marginBottom: 14 }}>Appearance</h3>
          <Segmented
            label="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Light', icon: <Sun size={16} /> },
              { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
              { value: 'system', label: 'System', icon: <Monitor size={16} /> },
            ]}
          />
        </div>

        <div className="tile span-6">
          <h3>Sign out</h3>
          <p className="muted small" style={{ margin: '6px 0 16px' }}>
            You can log back in any time. Your recipes and list are saved.
          </p>
          <Button
            variant="danger-ghost"
            className="mt-auto"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut size={16} /> Log out
          </Button>
        </div>
      </section>
    </div>
  );
}
