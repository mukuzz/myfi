import { FiChevronLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

interface ScreenContainerProps {
    children: React.ReactNode;
    title: string;
}

const ScreenContainer: React.FC<ScreenContainerProps> = ({ children, title }) => {

    const navigate = useNavigate();

    return (

        <div className="relative flex flex-col h-screen bg-background text-foreground">
            {/* Header Bar */}
            <header className="fixed top-0 left-0 right-0 z-10 h-full max-h-[80px] flex items-center justify-between p-4 border-b border-border flex-shrink-0 bg-background ">
                <button onClick={() => navigate(-1)} className="p-2">
                    <FiChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-semibold">{title}</h1>
                <div className="w-8"></div> {/* Spacer */}
            </header>

            <div className="flex flex-col pt-[80px] pb-[80px] bg-background text-foreground">
                {children}
            </div>
        </div>
    );
};

export default ScreenContainer;