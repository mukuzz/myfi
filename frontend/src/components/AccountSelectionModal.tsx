import React from 'react';
import DraggableBottomSheet from './DraggableBottomSheet';
import { Account } from '../types';
import { FiCreditCard, FiDollarSign } from 'react-icons/fi'; // Assuming icons

interface AccountSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectAccount: (account: Account | null) => void; // null represents CASH
    accounts: Account[];
}

const AccountSelectionModal: React.FC<AccountSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelectAccount,
    accounts
}) => {

    const handleSelect = (account: Account | null) => {
        onSelectAccount(account);
        // onClose(); // Keep modal open until amount is entered? No, user wants selection first.
    };

    return (
        <DraggableBottomSheet isOpen={isOpen} onClose={onClose} title="Select Account">
            <div className="p-4 bg-background text-foreground rounded-t-lg">
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto thin-scrollbar">
                    {/* CASH Option */}
                    <li
                        key="cash-account"
                        onClick={() => handleSelect(null)}
                        className="flex items-center p-3 bg-card rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    >
                        <FiDollarSign className="mr-3 text-muted-foreground" size={20} />
                        <div>
                            <p className="font-medium">CASH</p>
                            <p className="text-sm text-muted-foreground">Manual cash transaction</p>
                        </div>
                    </li>
                    {/* Real Accounts */}
                    {accounts.map(account => (
                        <li
                            key={account.id}
                            onClick={() => handleSelect(account)}
                            className="flex items-center p-3 bg-card rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        >
                            <FiCreditCard className="mr-3 text-muted-foreground" size={20} /> {/* Use a different icon? */}
                            <div>
                                <p className="font-medium">{account.name}</p>
                                <p className="text-sm text-muted-foreground">{account.type} - {account.accountNumber}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </DraggableBottomSheet>
    );
};

export default AccountSelectionModal; 