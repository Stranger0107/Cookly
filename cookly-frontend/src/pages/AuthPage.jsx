/**
 * Log in and Sign up share one component: same split bento layout,
 * different fields. Server validation errors show under each field.
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check, Circle } from 'lucide-react';
import { Mesh, TopBar } from '../components/Layout';
import { Button, Field, PasswordInput, TextInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8 && p.length <= 72, label: '8–72 characters' },
  { test: (p) => /[A-Za-z]/.test(p), label: 'At least one letter' },
  { test: (p) => /\d/.test(p), label: 'At least one number' },
];

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  useDocumentTitle(isRegister ? 'Sign up' : 'Log in');

  const { login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');
    try {
      const user = isRegister
        ? await register(form)
        : await login({ email: form.email, password: form.password });
      toast.success(isRegister ? `Welcome to Cookly, ${user.name}!` : `Welcome back, ${user.name}!`);
      navigate(location.state?.from?.pathname || '/home', { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      if (!Object.keys(err.fieldErrors || {}).length) setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Mesh />
      <TopBar minimal />
      <main className="page">
        <div className="bento auth">
          <form className="tile glass span-5 row-3 auth__form" onSubmit={onSubmit} noValidate>
            <div>
              <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
              <p className="muted" style={{ marginTop: 8 }}>
                {isRegister ? 'Start cooking with what you already have.' : 'Log in to see what you can make today.'}
              </p>
            </div>

            {formError && (
              <div className="banner banner--error" role="alert" style={{ margin: 0 }}>
                {formError}
              </div>
            )}

            {isRegister && (
              <Field label="Name" htmlFor="name" error={errors.name}>
                <TextInput id="name" value={form.name} onChange={set('name')} autoComplete="name" error={errors.name} maxLength={50} />
              </Field>
            )}

            <Field label="Email" htmlFor="email" error={errors.email}>
              <TextInput
                id="email"
                type="email"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                error={errors.email}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password}>
              <PasswordInput
                id="password"
                value={form.password}
                onChange={set('password')}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                error={errors.password}
              />
            </Field>

            {isRegister && (
              <ul className="pw-rules">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(form.password);
                  return (
                    <li key={rule.label} className={ok ? 'ok' : ''}>
                      {ok ? <Check size={14} /> : <Circle size={14} />} {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}

            <Button type="submit" size="lg" block loading={loading}>
              {isRegister ? 'Create account' : 'Log in'}
            </Button>

            <p className="muted small" style={{ textAlign: 'center' }}>
              {isRegister ? 'Already have an account? ' : "Don't have an account? "}
              <Link to={isRegister ? '/login' : '/register'} className="link">
                {isRegister ? 'Log in' : 'Sign up'}
              </Link>
            </p>
          </form>

          <div className="tile photo-tile span-7 row-3 auth__art">
            <img src="https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg" alt="" />
            <div className="photo-tile__caption">
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1.3 }}>
                “I opened the fridge, typed four things, and dinner was sorted.”
              </p>
              <p className="caption" style={{ marginTop: 8 }}>
                Teriyaki Chicken Casserole · 4 of 5 ingredients
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
