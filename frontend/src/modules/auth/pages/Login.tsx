import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, ArrowRight, Info, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { Loader } from '../../../components/ui/Loader';
import { login } from '../../../services/api';

const HOME_BY_ROLE: Record<string, string> = {
  super_admin: '/superadmin/companies',
  admin: '/',
  empresa: '/',
  staff: '/',
  agent: '/conversations',
};

const QUICK_ACCOUNTS = [
  { label: 'Super Administrador', role: 'Super Admin', email: 'admin+fabpsandoval@gmail.com' },
  { label: 'Administrador Staff', role: 'Staff', email: 'staff+fabpsandoval@gmail.com' },
  { label: 'Empresa Demo', role: 'Empresa', email: 'empresa@demo.com' },
  { label: 'Admin Local', role: 'Admin', email: 'admin@localhost' },
];

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickAccount, setQuickAccount] = useState('');

  const { login: setAuthSession } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await login(email, password);
      setAuthSession(data.user, data.organizationId);
      navigate(HOME_BY_ROLE[data.user.role] || '/');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Credenciales inválidas. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (accEmail: string) => {
    setIsLoading(true);
    setQuickAccount(accEmail);
    setError('');

    try {
      const data = await login(accEmail, 'admin123');
      setAuthSession(data.user, data.organizationId);
      navigate(HOME_BY_ROLE[data.user.role] || '/');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al iniciar sesión rápida.');
    } finally {
      setIsLoading(false);
      setQuickAccount('');
    }
  };

  return (
    <div className="min-h-screen bg-[#171717] font-sans text-white selection:bg-primary-500/30">
      <main className="mx-auto flex min-h-screen w-full max-w-[400px] flex-col justify-center px-6 py-10">
        <div className="mb-10 flex items-center gap-2.5">
          <MessageCircle className="h-5 w-5 text-primary-400" />
          <span className="text-base font-medium tracking-tight">CRM GSC</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-medium tracking-tight">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-gray-500">Ingresa tus credenciales para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="login-email" className="block text-sm text-gray-400">
              Correo electrónico
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-600 hover:border-white/15 focus:border-primary-500/60 focus:bg-white/[0.04]"
              placeholder="nombre@empresa.com"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="login-password" className="text-sm text-gray-400">
                Contraseña
              </label>
              <Link to="/recover-password" className="text-xs text-gray-500 transition-colors hover:text-primary-400">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-3 pr-11 text-sm text-white outline-none transition-colors placeholder:text-gray-600 hover:border-white/15 focus:border-primary-500/60 focus:bg-white/[0.04]"
                placeholder="Ingresa tu contraseña"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 transition-colors hover:text-gray-300"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 border-l-2 border-red-400/80 pl-3 text-sm text-red-300" role="alert">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading && !quickAccount ? (
              <Loader size="sm" />
            ) : (
              <>
                <span>Iniciar sesión</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-primary-400 transition-colors hover:text-primary-300">
            Crear cuenta
          </Link>
        </p>

        <details className="group mt-8 border-t border-white/10 pt-6">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm text-gray-500 transition-colors hover:text-gray-300 [&::-webkit-details-marker]:hidden">
            Acceso rápido de demostración
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3">
            {QUICK_ACCOUNTS.map((acc) => {
              const loadingThis = isLoading && quickAccount === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  disabled={isLoading}
                  className="flex w-full items-center justify-between gap-4 border-b border-white/5 py-2.5 text-left text-sm text-gray-300 transition-colors last:border-0 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{acc.label}</span>
                  <span className="flex items-center gap-2 text-xs text-gray-600">
                    {acc.role}
                    {loadingThis ? <Loader size="sm" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>
        </details>
      </main>
    </div>
  );
};
