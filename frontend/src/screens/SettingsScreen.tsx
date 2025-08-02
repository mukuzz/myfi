import { useState } from 'react';
import { FiMail, FiSave, FiKey, FiDollarSign, FiSettings, FiDatabase, FiLink } from 'react-icons/fi';
import { fetchGoogleAuthUrl, setCredentialKeyValue } from '../services/apiService';
import PassphraseModal from '../components/PassphraseModal';
import ScreenContainer from '../components/ScreenContainer';

// Define the keys to be managed
const CREDENTIAL_KEYS = {
  GOOGLE_OAUTH_CLIENT_ID: "GOOGLE_OAUTH_CLIENT_ID",
  GOOGLE_OAUTH_CLIENT_SECRET: "GOOGLE_OAUTH_CLIENT_SECRET",
  OPENAI_API_KEY: "OPENAI_API_KEY",
  OPEN_EXCHANGE_RATES_API_KEY: "OPEN_EXCHANGE_RATES_API_KEY",
  APP_HOST_URL: "APP_HOST_URL",
} as const;

// Updated CredentialKey to be the union of the values of CREDENTIAL_KEYS
type CredentialKey = typeof CREDENTIAL_KEYS[keyof typeof CREDENTIAL_KEYS];

function SettingsScreen() {
  const [isPassphraseModalOpen, setIsPassphraseModalOpen] = useState<boolean>(false);
  const [currentKeyToSet, setCurrentKeyToSet] = useState<CredentialKey | null>(null);

  // State for input values
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [googleClientSecret, setGoogleClientSecret] = useState<string>('');
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [openExchangeRatesApiKey, setOpenExchangeRatesApiKey] = useState<string>('');
  const [appHostUrl, setAppHostUrl] = useState<string>('');

  const handleOpenPassphraseModalForGmail = () => {
    setCurrentKeyToSet(null); // Differentiate from setting other keys
    setIsPassphraseModalOpen(true);
  };

  const handleOpenPassphraseModalForKeySet = (key: CredentialKey) => {
    setCurrentKeyToSet(key);
    setIsPassphraseModalOpen(true);
  };

  const handlePassphraseSubmit = async (masterKey: string) => {
    setIsPassphraseModalOpen(false);
    if (!currentKeyToSet) { // This is for Gmail Auth URL
      try {
        const authUrl = await fetchGoogleAuthUrl(masterKey);
        window.location.href = authUrl;
      } catch (error) {
        console.error('Failed to initiate Google Auth:', error);
        alert(`Failed to start Google Authentication: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else { // This is for setting a key-value pair
      let valueToSet = '';
      switch (currentKeyToSet) {
        case CREDENTIAL_KEYS.GOOGLE_OAUTH_CLIENT_ID:
          valueToSet = googleClientId;
          break;
        case CREDENTIAL_KEYS.GOOGLE_OAUTH_CLIENT_SECRET:
          valueToSet = googleClientSecret;
          break;
        case CREDENTIAL_KEYS.OPENAI_API_KEY:
          valueToSet = openaiApiKey;
          break;
        case CREDENTIAL_KEYS.OPEN_EXCHANGE_RATES_API_KEY:
          valueToSet = openExchangeRatesApiKey;
          break;
        case CREDENTIAL_KEYS.APP_HOST_URL:
          valueToSet = appHostUrl;
          break;
      }

      if (!valueToSet.trim()) {
        alert(`Value for ${currentKeyToSet} cannot be empty.`);
        setCurrentKeyToSet(null);
        return;
      }

      try {
        await setCredentialKeyValue(currentKeyToSet, valueToSet, masterKey);
        alert(`Successfully set ${currentKeyToSet}`);
        // Optionally clear the input field after successful submission
        switch (currentKeyToSet) {
          case CREDENTIAL_KEYS.GOOGLE_OAUTH_CLIENT_ID: setGoogleClientId(''); break;
          case CREDENTIAL_KEYS.GOOGLE_OAUTH_CLIENT_SECRET: setGoogleClientSecret(''); break;
          case CREDENTIAL_KEYS.OPENAI_API_KEY: setOpenaiApiKey(''); break;
          case CREDENTIAL_KEYS.OPEN_EXCHANGE_RATES_API_KEY: setOpenExchangeRatesApiKey(''); break;
          case CREDENTIAL_KEYS.APP_HOST_URL: setAppHostUrl(''); break;
        }
      } catch (error) {
        console.error(`Failed to set ${currentKeyToSet}:`, error);
        alert(`Failed to set ${currentKeyToSet}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setCurrentKeyToSet(null);
      }
    }
  };

  const renderInputForKey = (
    key: CredentialKey,
    value: string,
    setter: (val: string) => void,
    placeholder: string,
    description?: string,
    icon?: React.ReactNode,
    type?: string
  ) => (
    <div key={key} className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        {icon && <div className="text-primary mt-0.5">{icon}</div>}
        <div className="flex-1">
          <label htmlFor={key} className="block text-sm font-semibold text-foreground mb-1">
            {key.replace(/_/g, ' ').replace(/API/g, 'API').replace(/URL/g, 'URL')}
          </label>
          {description && (
            <p className="text-xs text-muted-foreground mb-2">{description}</p>
          )}
        </div>
      </div>
      <div className="flex w-full items-center gap-2">
        <input
          id={key}
          type={type}
          value={value}
          onChange={(e) => setter(e.target.value)}
          placeholder={placeholder}
          className="flex-grow p-3 border border-border rounded-md bg-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all w-full"
        />
        <button
          onClick={() => handleOpenPassphraseModalForKeySet(key)}
          disabled={!value.trim()}
          className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label={`Set ${key.replace(/_/g, ' ')}`}
        >
          <FiSave size={16} />
          Save
        </button>
      </div>
    </div>
  );

  return (
    <ScreenContainer title="Settings">
      <div className="bg-background text-foreground flex flex-col flex-grow space-y-8 p-6 overflow-y-auto" style={{ scrollbarWidth: 'none', fontSize: '14px' }}>
        
        {/* Gmail Integration Section */}
        <div className="flex flex-col gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FiMail className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Gmail Integration</h2>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Connect your Gmail account for automatic transaction sync
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenPassphraseModalForGmail}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium w-full sm:w-fit"
          >
            <FiMail size={18} />
            Connect Gmail Account
          </button>
        </div>

        {/* API Configuration Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FiSettings className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">API Configuration</h2>
              <p className="text-sm text-muted-foreground">
                Configure API keys and application settings. All values are encrypted and require master key authentication.
              </p>
            </div>
          </div>

          {/* Google OAuth Section */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-foreground flex items-center gap-2">
              <FiDatabase size={18} />
              Google OAuth Configuration
            </h3>
            <div className="grid gap-4">
              {renderInputForKey(
                CREDENTIAL_KEYS.GOOGLE_OAUTH_CLIENT_ID, 
                googleClientId, 
                setGoogleClientId, 
                "Enter Google OAuth Client ID",
                "Client ID from Google Cloud Console for OAuth authentication",
                <FiKey size={16} />,
                "password"
              )}
              {renderInputForKey(
                CREDENTIAL_KEYS.GOOGLE_OAUTH_CLIENT_SECRET, 
                googleClientSecret, 
                setGoogleClientSecret, 
                "Enter Google OAuth Client Secret",
                "Client Secret from Google Cloud Console for OAuth authentication",
                <FiKey size={16} />,
                "password"
              )}
            </div>
          </div>

          {/* AI & External APIs Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
              <FiDollarSign size={18} />
              AI & External Services
            </h3>
            <div className="grid gap-4">
              {renderInputForKey(
                CREDENTIAL_KEYS.OPENAI_API_KEY, 
                openaiApiKey, 
                setOpenaiApiKey, 
                "Enter OpenAI API Key",
                "API key for transaction extraction and processing via OpenAI",
                <FiDatabase size={16} />,
                "password"
              )}
              {renderInputForKey(
                CREDENTIAL_KEYS.OPEN_EXCHANGE_RATES_API_KEY, 
                openExchangeRatesApiKey, 
                setOpenExchangeRatesApiKey, 
                "Enter Open Exchange Rates API Key",
                "API key for real-time currency conversion and historical exchange rates",
                <FiDollarSign size={16} />,
                "password"
              )}
            </div>
          </div>

          {/* Application Configuration Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
              <FiLink size={18} />
              Application Configuration
            </h3>
            <div className="grid gap-4">
              {renderInputForKey(
                CREDENTIAL_KEYS.APP_HOST_URL, 
                appHostUrl, 
                setAppHostUrl, 
                "e.g., http://localhost:8080 or https://yourdomain.com",
                "Base URL for the application backend server",
                <FiLink size={16} />,
                "url"
              )}
            </div>
          </div>
        </div>

        <PassphraseModal
          isOpen={isPassphraseModalOpen}
          onClose={() => {
            setIsPassphraseModalOpen(false);
            setCurrentKeyToSet(null);
          }}
          onPassphraseSubmit={handlePassphraseSubmit}
        />
      </div>
    </ScreenContainer>
  );
}

export default SettingsScreen; 