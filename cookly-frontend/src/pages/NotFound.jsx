import { Link } from 'react-router-dom';
import { Mesh, TopBar } from '../components/Layout';
import { EmptyState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  const { isAuthenticated } = useAuth();
  return (
    <>
      <Mesh />
      <TopBar />
      <main className="page">
        <div className="tile glass" style={{ marginTop: 24 }}>
          <EmptyState
            emoji="🍽️"
            title="This page has gone off the menu"
            action={
              <Link to={isAuthenticated ? '/home' : '/'} className="btn btn--primary">
                Take me home
              </Link>
            }
          >
            The link might be broken, or the page has moved.
          </EmptyState>
        </div>
      </main>
    </>
  );
}
