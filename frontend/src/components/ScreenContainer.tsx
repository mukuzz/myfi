import { FiChevronLeft } from "react-icons/fi";
import { useNavigation } from "../hooks/useNavigation";

interface ScreenContainerProps {
    children: React.ReactNode;
    title: string;
}

const ScreenContainer: React.FC<ScreenContainerProps> = ({ children, title }) => {
    const { goBack } = useNavigation();

    return (
        <div className="fixed top-0 left-0 right-0 h-screen flex flex-col bg-background text-foreground">
            {/* Header Bar */}
            <header className="flex-shrink-0 flex flex-row items-center justify-between p-4 border-b border-border bg-background ">
                <button className="p-2"
                    onClick={goBack}>
                    <FiChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-semibold">{title}</h1>
                <div className="w-[42px]"></div> {/* Spacer */}
            </header>

            <div className="flex-grow h-full overflow-y-auto bg-background text-foreground">
                {children}
            </div>
        </div>
    );
};

export default ScreenContainer;