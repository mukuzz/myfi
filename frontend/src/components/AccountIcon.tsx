import { Account } from "../types";
import { ReactComponent as HDFC } from '../assets/icons/HDFC.svg';
import { ReactComponent as ICICI } from '../assets/icons/ICICI.svg';
import { ReactComponent as BOI } from '../assets/icons/BOI.svg';
import { ReactComponent as FederalBank } from '../assets/icons/FederalBank.svg';
import { ReactComponent as Amex } from '../assets/icons/Amex.svg';
const AccountIcon = ({ account, className }: { account: Account, className?: string }) => {
  return (
    <div className={`flex items-center pointer-events-none ${className}`} title={`Account ID: ${account.id}`}>
      {(account.name === 'HDFC' || account.name === 'HDFC Pixel') && <HDFC />}
      {account.name === 'ICICI' && <ICICI />}
      {account.name === 'BOI' && <BOI />}
      {account.name === 'OneCard' && <FederalBank className="w-8 h-8" />}
      {account.name === 'Amex' && <Amex />}
    </div>
  );
};

export default AccountIcon;