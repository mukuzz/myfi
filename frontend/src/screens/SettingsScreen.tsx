import { useState } from 'react';
import { FiMail, FiSave, FiKey } from 'react-icons/fi';
import { fetchGoogleAuthUrl, setCredentialKeyValue } from '../services/apiService';
import PassphraseModal from '../components/PassphraseModal';
import ScreenContainer from '../components/ScreenContainer';

// Define the keys to be managed
const CREDENTIAL_KEYS = {
  GOOGLE_OAUTH_CLIENT_ID: "GOOGLE_OAUTH_CLIENT_ID",
  GOOGLE_OAUTH_CLIENT_SECRET: "GOOGLE_OAUTH_CLIENT_SECRET",
  OPENAI_API_KEY: "OPENAI_API_KEY",
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
    placeholder: string
  ) => (
    <div key={key} className="mb-4">
      <label htmlFor={key} className="block text-sm font-medium text-muted-foreground mb-1">
        {key.replace(/_/g, ' ')}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={key}
          type="text"
          value={value}
          onChange={(e) => setter(e.target.value)}
          placeholder={placeholder}
          className="flex-grow p-2 border border-border rounded-md bg-input text-foreground placeholder:text-muted-foreground"
        />
        <button
          onClick={() => handleOpenPassphraseModalForKeySet(key)}
          className="flex items-center gap-2 px-3 py-1.5 text-primary text-sm border border-border rounded-md hover:bg-muted transition-colors"
          aria-label={`Set ${key.replace(/_/g, ' ')}`}
        >
          <FiSave size={18} />
          Set
        </button>
      </div>
    </div>
  );

  return (
    <ScreenContainer title="Settings">
      <div className="bg-background text-foreground flex flex-col flex-grow space-y-6 p-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="p-4 border border-border rounded-md">
          <h2 className="text-xl font-semibold mb-3">Gmail Integration</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your Gmail account to automatically sync email transactions and updates.
          </p>
          <button
            onClick={handleOpenPassphraseModalForGmail}
            className="flex items-center gap-2 px-3 py-1.5 text-primary text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            <FiMail size={18} />
            Connect Gmail
          </button>
        </div>

        <div className="p-4 border border-border rounded-md">
          <div className="flex items-top gap-2 mb-3">
            <FiKey className='mt-1' size={20} />
            <h2 className="text-xl font-semibold">API Credentials & Configuration</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Set the necessary API keys and configuration values for the application. Each value requires the master key for an authorized update.
          </p>

          {renderInputForKey(CREDENTIAL_KEYS.GOOGLE_OAUTH_CLIENT_ID, googleClientId, setGoogleClientId, "Enter Google OAuth Client ID")}
          {renderInputForKey(CREDENTIAL_KEYS.GOOGLE_OAUTH_CLIENT_SECRET, googleClientSecret, setGoogleClientSecret, "Enter Google OAuth Client Secret")}
          {renderInputForKey(CREDENTIAL_KEYS.OPENAI_API_KEY, openaiApiKey, setOpenaiApiKey, "Enter OpenAI API Key")}
          {renderInputForKey(CREDENTIAL_KEYS.APP_HOST_URL, appHostUrl, setAppHostUrl, "e.g., http://localhost:8080")}

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