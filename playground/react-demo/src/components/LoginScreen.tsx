import { useState } from 'react';
import { StaticCredentialProvider } from '@signalwire/js';
import type { CredentialProvider } from '@signalwire/js';
import { UserCredentialProvider } from '../auth/UserCredentialProvider';

interface LoginScreenProps {
  onConnect: (provider: CredentialProvider) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

type AuthTab = 'token' | 'user';

/**
 * Authentication screen supporting two sign-in methods:
 * 1. SAT Token — paste a pre-obtained token
 * 2. User — reference + password login
 */
export function LoginScreen({ onConnect, isLoading, error }: LoginScreenProps) {
  const hasBuildTimeToken = typeof SAT_TOKEN === 'string' && SAT_TOKEN !== 'null';

  const [activeTab, setActiveTab] = useState<AuthTab>('token');
  const [token, setToken] = useState(hasBuildTimeToken ? SAT_TOKEN! : '');
  const [reference, setReference] = useState('');
  const [password, setPassword] = useState('');

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    const provider = new StaticCredentialProvider({ token: token.trim() });
    void onConnect(provider);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim() || !password.trim()) return;
    const provider = new UserCredentialProvider({
      reference: reference.trim(),
      password: password.trim(),
    });
    void onConnect(provider);
  };

  const tabs: { id: AuthTab; label: string }[] = [
    { id: 'token', label: 'Token' },
    { id: 'user', label: 'User' },
  ];

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <h1 className="text-2xl font-bold text-center mb-1">
          SignalWire React Demo
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Connect to start making calls
        </p>

        {/* Auth tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* Token form */}
        {activeTab === 'token' && (
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="token"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Subscriber Access Token
              </label>
              <input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !token.trim()}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          </form>
        )}

        {/* User form */}
        {activeTab === 'user' && (
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reference"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Reference (email)
              </label>
              <input
                id="reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !reference.trim() || !password.trim()}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Connecting...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
