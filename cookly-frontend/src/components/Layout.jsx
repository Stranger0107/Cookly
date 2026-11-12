/**
 * App shell: gradient-mesh background, glass top bar (desktop/tablet),
 * glass bottom tab bar (mobile), and the page content in between.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Sparkles, BookOpen, ShoppingBasket, Moon, Sun, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Modal from './Modal';
import { Button } from './ui';

const NAV = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/match', label: 'What can I make?', short: 'Match', icon: Sparkles },
  { to: '/recipes', label: 'My Recipes', short: 'Recipes', icon: BookOpen },
  { to: '/shopping-list', label: 'Shopping List', short: 'List', icon: ShoppingBasket },
];

export function Mesh() {
  return (
    <div className="mesh" aria-hidden>
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  return (
    <button className="icon-btn" onClick={toggle} aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}>
      {resolved === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!user) return null;

  return (
    <div className="menu" ref={ref}>
      <button className="avatar" onClick={() => setOpen((o) => !o)} aria-label="Account menu" aria-expanded={open}>
        {user.name.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="menu__panel glass">
          <div className="menu__head">
            <div style={{ fontWeight: 700 }}>{user.name}</div>
            <div className="caption">{user.email}</div>
          </div>
          <button className="menu__item" onClick={() => { setOpen(false); navigate('/profile'); }}>
            <User size={18} /> Profile
          </button>
          <button className="menu__item" onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={18} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function TopBar({ minimal = false }) {
  const { isAuthenticated } = useAuth();
  return (
    <header className="topbar">
      <div className="topbar__inner glass">
        <Link to={isAuthenticated ? '/home' : '/'} className="logo">
          <img src="/favicon.svg" alt="" />
          Cookly
        </Link>

        {isAuthenticated && !minimal && (
          <nav className="nav" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} title={label}>
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        <div className="topbar__right">
          <ThemeToggle />
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost btn--sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn--primary btn--sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function TabBar() {
  return (
    <nav className="tabbar glass" aria-label="Main">
      {NAV.map(({ to, label, short, icon: Icon }) => (
        <NavLink key={to} to={to}>
          <Icon size={22} />
          {short || label}
        </NavLink>
      ))}
    </nav>
  );
}

function SessionExpiredModal() {
  const { sessionExpired, dismissSessionExpired } = useAuth();
  const navigate = useNavigate();
  return (
    <Modal
      open={sessionExpired}
      title="Your session expired"
      onClose={dismissSessionExpired}
      actions={
        <Button
          onClick={() => {
            dismissSessionExpired();
            navigate('/login');
          }}
        >
          Log in again
        </Button>
      }
    >
      For your security we signed you out. Please log in again to continue.
    </Modal>
  );
}

/** Layout for logged-in pages. */
export default function AppLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Mesh />
      <TopBar />
      <main>
        <Outlet />
      </main>
      <TabBar />
      <SessionExpiredModal />
    </>
  );
}
