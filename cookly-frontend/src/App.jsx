/**
 * Routes.
 *   public:    /  /login  /register   (logged-in users are sent to /home)
 *   protected: everything inside <AppLayout> (logged-out users go to /login)
 *
 * Uses a "data router" (createBrowserRouter) so the recipe form can warn
 * about unsaved changes with useBlocker.
 */
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/Layout';
import { GuestOnly, RequireAuth } from './components/RouteGuards';
import Landing from './pages/Landing';
import AuthPage from './pages/AuthPage';
import Home from './pages/Home';
import MatchResults from './pages/MatchResults';
import Explore from './pages/Explore';
import RecipeDetail from './pages/RecipeDetail';
import MyRecipes from './pages/MyRecipes';
import RecipeForm from './pages/RecipeForm';
import ShoppingList from './pages/ShoppingList';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// Providers sit inside the router so they can use navigation hooks.
function Root() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/', element: <Landing /> },
          { path: '/login', element: <AuthPage mode="login" /> },
          { path: '/register', element: <AuthPage mode="register" /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/home', element: <Home /> },
              { path: '/match', element: <MatchResults /> },
              { path: '/explore', element: <Explore /> },
              { path: '/meals/:mealdbId', element: <RecipeDetail kind="mealdb" /> },
              { path: '/recipes', element: <MyRecipes /> },
              { path: '/recipes/new', element: <RecipeForm /> },
              { path: '/recipes/:id', element: <RecipeDetail kind="mine" /> },
              { path: '/recipes/:id/edit', element: <RecipeForm /> },
              { path: '/shopping-list', element: <ShoppingList /> },
              { path: '/profile', element: <Profile /> },
            ],
          },
        ],
      },
      { path: '/dashboard', element: <Navigate to="/home" replace /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
