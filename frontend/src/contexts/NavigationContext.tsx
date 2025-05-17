import React, { createContext, useState, useCallback, ReactElement, ReactNode, useEffect, useRef } from 'react';
import './NavigationStyles.css'; // Import the styles

type ScreenStatus = 'entering' | 'active' | 'exiting' | 'covered';

interface ScreenEntry {
    id: string;
    element: ReactElement;
    status: ScreenStatus;
}

export interface NavigationContextType { // Exporting for use in useNavigation hook
    navigateTo: (screenElement: ReactElement) => void;
    goBack: () => void;
}

export const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
    children: ReactNode; // Base screen content
}

const DRAG_THRESHOLD_RATIO = 0.3; // Drag 30% of screen width to trigger goBack
const DRAG_EDGE_ZONE = 40; // Pixels from left edge to initiate drag

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
    const [screenStack, setScreenStack] = useState<ScreenEntry[]>([]);
    
    // Dragging State
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragCurrentX, setDragCurrentX] = useState(0);
    const [draggedScreenId, setDraggedScreenId] = useState<string | null>(null);

    const activeScreenRef = useRef<HTMLDivElement | null>(null);
    const baseScreenRef = useRef<HTMLDivElement | null>(null); // Ref for the base screen

    const navigateTo = useCallback((screenElement: ReactElement) => {
        const screenId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setScreenStack(prevStack => {
            const newStack = prevStack.map(screen => ({
                ...screen,
                status: screen.status !== 'exiting' ? 'covered' as ScreenStatus : screen.status,
            }));
            return [...newStack, { id: screenId, element: screenElement, status: 'entering' }];
        });
    }, []);

    const goBack = useCallback(() => {
        setScreenStack(prevStack => {
            if (prevStack.length === 0) return prevStack;
            const newStack = [...prevStack];
            const topScreenIndex = newStack.length - 1;
            if (newStack[topScreenIndex].status === 'exiting') return prevStack;
            newStack[topScreenIndex].status = 'exiting';
            if (topScreenIndex > 0) {
                newStack[topScreenIndex - 1].status = 'active';
            } // Else, the base screen becomes active by default (handled by baseScreenStatus)
            return newStack;
        });
    }, []);

    useEffect(() => {
        let enteringTimer: NodeJS.Timeout | undefined;
        let exitingTimer: NodeJS.Timeout | undefined;

        const enteringScreen = screenStack.find(s => s.status === 'entering');
        const exitingScreen = screenStack.find(s => s.status === 'exiting');

        if (enteringScreen) {
            enteringTimer = setTimeout(() => {
                setScreenStack(prev =>
                    prev.map(s => (s.id === enteringScreen.id ? { ...s, status: 'active' } : s))
                );
            }, 10); 
        }

        if (exitingScreen) {
            exitingTimer = setTimeout(() => {
                setScreenStack(prev => prev.filter(s => s.id !== exitingScreen.id));
            }, 350); 
        }

        return () => {
            if (enteringTimer) clearTimeout(enteringTimer);
            if (exitingTimer) clearTimeout(exitingTimer);
        };
    }, [screenStack]);

    // Touch event handlers for drag-to-go-back
    const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>, screenId: string) => {
        if (event.touches[0].clientX < DRAG_EDGE_ZONE) { // Only start drag if near left edge
            setIsDragging(true);
            setDragStartX(event.touches[0].clientX);
            setDragCurrentX(event.touches[0].clientX);
            setDraggedScreenId(screenId);
            // Prevent page scroll during drag
            // event.preventDefault(); // Can cause issues with nested scrollables, use with caution
        }
    }, []);

    const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
        if (isDragging) {
            setDragCurrentX(event.touches[0].clientX);
            // event.preventDefault(); // Can cause issues
        }
    }, [isDragging]);

    const handleTouchEnd = useCallback(() => {
        if (isDragging && draggedScreenId) {
            const dragDistance = dragCurrentX - dragStartX;
            const screenWidth = activeScreenRef.current?.offsetWidth || window.innerWidth;

            if (dragDistance > screenWidth * DRAG_THRESHOLD_RATIO) {
                goBack();
            } // Else, it will snap back due to CSS transition when inline style is removed
        }
        setIsDragging(false);
        setDraggedScreenId(null);
        // dragStartX and dragCurrentX don't need reset here, they'll be set on next drag start
    }, [isDragging, draggedScreenId, dragStartX, dragCurrentX, goBack]);

    const getScreenClassAndStyle = (screen: ScreenEntry, indexInStack: number, isBaseScreen: boolean = false) => {
        let className = 'screen';
        const style: React.CSSProperties = {};
        const currentStatus = screen.status;

        if (isDragging && screen.id === draggedScreenId) {
            const dragDelta = Math.max(0, dragCurrentX - dragStartX); // Don't allow dragging left past origin
            style.transform = `translateX(${dragDelta}px)`;
            style.transition = 'none'; // Disable transition during active drag for immediate feedback
            style.boxShadow = screenStack.length > 0 ? '-3px 0 15px rgba(0, 0, 0, 0.12)' : 'none'; // Keep shadow while dragging
             // Set z-index high for dragging element
            style.zIndex = 100; 
        } else {
            switch (currentStatus) {
                case 'entering': 
                    className += ' screen-entering'; 
                    style.zIndex = screenStack.length + 2; // Higher z-index for entering screen
                    break;
                case 'active': 
                    className += ' screen-active'; 
                    style.zIndex = isBaseScreen ? 0 : screenStack.length + 1;
                    break;
                case 'exiting': 
                    className += ' screen-exiting'; 
                    style.zIndex = screenStack.length; // Exiting screen z-index
                    break;
                case 'covered': 
                    className += ' screen-covered'; 
                     // Covered screens have lower z-index, allow CSS to manage or set explicitly if needed
                    style.zIndex = isBaseScreen ? -1 : indexInStack + 1; // ensure covered screens are below active ones
                    break;
            }
        }
        return { className, style };
    };

    // Determine base screen status and style
    const getBaseScreenStatus = () => {
        if (screenStack.some(s => s.status === 'entering' || s.status === 'active')) {
            return 'covered';
        }
        return 'active';
    };
    
    const baseScreenComputedStatus = getBaseScreenStatus();
    const { className: baseScreenClassName, style: baseScreenStyle } = getScreenClassAndStyle(
        { id: 'base', element: <></>, status: baseScreenComputedStatus }, 
        -1, 
        true
    );
    
    // Adjust base screen style if it's being revealed by a drag
    if (isDragging && screenStack.length === 1 && screenStack[0].id === draggedScreenId) {
        const dragDelta = Math.max(0, dragCurrentX - dragStartX);
        const screenWidth = activeScreenRef.current?.offsetWidth || window.innerWidth;
        const dragProgress = Math.min(1, dragDelta / screenWidth);
        const initialTranslateX = -0.25 * screenWidth; // Assuming covered is -25% of active screen width
        const currentCoveredTranslateX = initialTranslateX * (1 - dragProgress);
        
        baseScreenStyle.transform = `translateX(${currentCoveredTranslateX}px)`;
        baseScreenStyle.transition = 'none'; 
        baseScreenStyle.zIndex = 0; // Ensure base is below dragged item
    }


    return (
        <NavigationContext.Provider value={{ navigateTo, goBack }}>
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
                {/* Base Screen (Children) */}
                <div
                    ref={baseScreenRef}
                    className={baseScreenClassName}
                    style={baseScreenStyle}
                >
                    {children}
                </div>

                {/* Stacked Screens */}
                {screenStack.map((screenEntry, index) => {
                    const { className, style } = getScreenClassAndStyle(screenEntry, index);
                    const isActiveTopScreen = index === screenStack.length - 1 && screenEntry.status === 'active';
                    
                    return (
                        <div
                            key={screenEntry.id}
                            ref={isActiveTopScreen ? activeScreenRef : null}
                            className={className}
                            style={style}
                            onTouchStart={isActiveTopScreen ? (e) => handleTouchStart(e, screenEntry.id) : undefined}
                            onTouchMove={isActiveTopScreen ? handleTouchMove : undefined}
                            onTouchEnd={isActiveTopScreen ? handleTouchEnd : undefined}
                            onTouchCancel={isActiveTopScreen ? handleTouchEnd : undefined} // Treat cancel as end of drag
                        >
                            {screenEntry.element}
                        </div>
                    );
                })}
            </div>
        </NavigationContext.Provider>
    );
}; 