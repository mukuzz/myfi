import { useState } from 'react';
import { FiMail } from 'react-icons/fi';
import { fetchGoogleAuthUrl } from '../services/apiService';
import PassphraseModal from '../components/PassphraseModal';

function SettingsScreen() {
  const [isPassphraseModalOpen, setIsPassphraseModalOpen] = useState<boolean>(false);

  const handleOpenPassphraseModal = () => {
    setIsPassphraseModalOpen(true);
  };

  const handlePassphraseSubmit = async (masterKey: string) => {
    setIsPassphraseModalOpen(false);
    try {
      const authUrl = await fetchGoogleAuthUrl(masterKey);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate Google Auth:', error);
      alert(`Failed to start Google Authentication: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="bg-background text-foreground flex flex-col flex-grow space-y-4 p-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="flex justify-between items-center mb-2 ml-1">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="p-4 border border-border rounded-md">
        <h2 className="text-xl font-semibold mb-3">Gmail Integration</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your Gmail account to automatically sync email transactions and updates.
        </p>
        <button
          onClick={handleOpenPassphraseModal}
          className="flex items-center gap-2 px-3 py-1.5 text-primary text-sm border border-border rounded-md hover:bg-muted transition-colors"
        >
          <FiMail size={18} />
          Connect Gmail
        </button>
      </div>
      
      <PassphraseModal 
        isOpen={isPassphraseModalOpen}
        onClose={() => setIsPassphraseModalOpen(false)}
        onPassphraseSubmit={handlePassphraseSubmit}
      />
    </div>
  );
}

export default SettingsScreen; 