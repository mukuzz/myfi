import { useState } from 'react';
import { Account } from '../types';
import AccountCard from './AccountCard';
import CustomToast from './CustomToast';
import { FiChevronRight } from 'react-icons/fi';
import { copyToClipboard } from '../utils/clipboard';

interface ParentAccountCardProps {
    parentAccount: Account;
    onCardClick?: (account: Account) => void;
    onEditBalance?: () => void;
    showEditBalance?: boolean;
}

function ParentAccountCard({
    parentAccount,
    onCardClick,
    onEditBalance,
    showEditBalance = false
}: ParentAccountCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const toggleExpansion = () => {
        setIsExpanded(prev => !prev);
    };

    const handleCopyAccountNumber = async (accountNumber: string) => {
        try {
            await copyToClipboard(accountNumber);
            setToastMessage('Account number copied');
        } catch (err) {
            console.error('Copy failed:', err);
            setToastMessage('Failed to copy account number');
        } finally {
            setTimeout(() => setToastMessage(null), 1000);
        }
    };

    // Safe access to children with null check
    const children = parentAccount.children || [];
    const hasChildren = children.length > 0;

    // Calculate dynamic width based on number of child accounts
    const childAccountsWidth = children.length * 270; // 270px per account
    const maxWidth = isExpanded ? `${childAccountsWidth}px` : '0px';

    return (
        <div className="flex flex-row justify-start">
            <div className="inline-flex align-top">
                {/* Parent Account Card */}
                <div className={`min-w-[270px] relative ${onCardClick ? 'cursor-pointer' : ''}`} onClick={() => onCardClick && onCardClick(parentAccount)}>
                    <div className={`bg-card overflow-hidden border-[0.7px] border-border ${hasChildren ? 'rounded-l-2xl' : 'rounded-2xl'
                        }`}>
                        <AccountCard
                            account={parentAccount}
                            handleCopyAccountNumber={handleCopyAccountNumber}
                            onEditBalance={onEditBalance}
                            showEditBalance={showEditBalance}
                        />
                    </div>
                </div>

                {/* Child Accounts - animated slide from below to right */}
                <div
                    className={`overflow-hidden h-full transition-all duration-300 ease-in-out ${onCardClick ? 'cursor-pointer' : ''}`}
                    style={{
                        maxWidth: maxWidth
                    }}
                    onClick={() => onCardClick && onCardClick(parentAccount)}
                >
                    <div
                        className={`flex flex-row justify-start h-full transition-transform duration-300 ease-in-out ${isExpanded ? 'translate-x-0' : 'translate-x-[-50px]'
                            }`}
                    >
                        {children.map((childAccount, index) => (
                            <div
                                key={childAccount.id}
                                className={`min-w-[270px] h-full transition-all duration-300 ease-in-out ${isExpanded
                                    ? 'translate-x-0'
                                    : 'translate-x-[-30px]'
                                    }`}
                                style={{
                                    transitionDelay: isExpanded ? `${index * 100}ms` : '0ms'
                                }}
                            >
                                <div className={`bg-card overflow-hidden h-full border border-border`}>
                                    <AccountCard
                                        account={childAccount}
                                        handleCopyAccountNumber={handleCopyAccountNumber}
                                        showBalance={childAccount.balance !== 0}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Toggle Bar - positioned at the end */}
                {hasChildren && (
                    <div className="flex items-center">
                        <button
                            onClick={toggleExpansion}
                            className="h-full w-[30px] bg-muted border border-border rounded-r-2xl flex items-center justify-center transition-all duration-200 group"
                            aria-label={isExpanded ? 'Collapse child accounts' : 'Expand child accounts'}
                        >
                            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                                <FiChevronRight size={16} className="text-muted-foreground" />
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* Toast notification */}
            <CustomToast message={toastMessage} isVisible={!!toastMessage} />
        </div>
    );
}

export default ParentAccountCard; 