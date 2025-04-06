import React, { useState, useRef, useCallback, useEffect } from 'react';

interface DraggableBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Optional: Add props for customizing height, initial snap point, etc. later
}

const DRAG_THRESHOLD = 100; // Pixels to drag down before closing

function DraggableBottomSheet({
  isOpen,
  onClose,
  children,
}: DraggableBottomSheetProps) {
  const [currentTranslateY, setCurrentTranslateY] = useState(0); // Tracks drag offset
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalBackgroundRef = useRef<HTMLDivElement>(null);
  // Reset state and clear inline transition when modal is closed/reopened
  useEffect(() => {
    if (!isOpen) {
      setCurrentTranslateY(0);
      if (modalRef.current) {
        // Only clear transition style immediately; transform is cleared after animation
        modalRef.current.style.transition = '';
        
      }
    }
    // We don't reset transform here anymore
  }, [isOpen]);

  // Effect to cleanup inline transform style *after* the closing animation completes
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    if (!isOpen && modalRef.current) {
      // Wait for the duration of the CSS close animation
      timerId = setTimeout(() => {
        if (modalRef.current) {
           modalRef.current.style.transform = '';
        }
      }, 300); // Match CSS transition duration (CHANGED to 300)
    }

    // Cleanup the timer if the component unmounts or isOpen changes back to true
    return () => {
       if (timerId) {
          clearTimeout(timerId);
       }
    };
  }, [isOpen]); // Depend only on isOpen

  // Effect to manage background color opacity via JS
  useEffect(() => {
    const backgroundElement = modalBackgroundRef.current;
    if (backgroundElement) {
      // Ensure transition is set for both opening and closing
      backgroundElement.style.transition = 'background-color 0.2s ease-in-out';
      if (isOpen) {
        // Use requestAnimationFrame to ensure the transition applies correctly after initial render/display change
        requestAnimationFrame(() => {
           backgroundElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        });
      } else {
        backgroundElement.style.backgroundColor = 'rgba(0, 0, 0, 0)';
      }
    }
    // No cleanup needed for background-color/transition here as it's reapplied based on isOpen
  }, [isOpen]);

  // Effect to prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset'; // Or 'auto' depending on default
    }
    // Cleanup function to restore scroll on component unmount or close
    return () => {
      document.body.style.overflow = 'unset'; // Or 'auto'
    };
  }, [isOpen]);

  // Helper to find the nearest scrollable parent within the sheet
  const findScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
    if (!element || element === modalRef.current) {
      return null;
    }
    const style = window.getComputedStyle(element);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      return element;
    }
    return findScrollableParent(element.parentElement);
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Check if the event target is the drag handle itself or within it
    const handleElement = e.currentTarget.querySelector('[data-drag-handle="true"]');
    const isDragHandle = handleElement?.contains(e.target as Node);

    let shouldStartDragging = false;

    if (isDragHandle) {
      shouldStartDragging = true;
    } else {
      // If not the handle, check scroll position of content
      const scrollableParent = findScrollableParent(e.target as HTMLElement);
      if (scrollableParent) {
        // Only allow dragging content if scrolled to the top
        if (scrollableParent.scrollTop === 0) {
           shouldStartDragging = true;
        }
        // If scrollableParent.scrollTop > 0, do nothing, allow native scroll
      } else {
         // If no scrollable parent found within content, allow dragging
         shouldStartDragging = true;
      }
    }

    if (shouldStartDragging && modalRef.current) {
        isDragging.current = true;
        dragStartY.current = e.clientY;
        modalRef.current.style.transition = 'none'; // Disable transition during drag
        // Capture pointer on the element that received the event (the modal div)
        e.currentTarget.setPointerCapture(e.pointerId);
    } 
    // If shouldStartDragging is false, we don't capture the pointer or set state,
    // allowing native scrolling of the inner content.

  }, []); // No dependencies needed for this logic

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !modalRef.current) return;
    const currentY = e.clientY;
    let deltaY = currentY - dragStartY.current;
    const newTranslateY = Math.max(0, deltaY);
    setCurrentTranslateY(newTranslateY);
    modalRef.current.style.transform = `translateY(${newTranslateY}px)`;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !modalRef.current || !modalBackgroundRef.current) return;

    const modalElement = modalRef.current; // Cache for use in setTimeout/cleanup
    const backgroundElement = modalBackgroundRef.current;

    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    // Enable smooth transition (for snap-back)
    modalElement.style.transition = 'transform 0.3s ease-in-out'; // Keep snap-back at 300ms
    backgroundElement.style.transition = 'background-color 0.2s ease-in-out';

    if (currentTranslateY > DRAG_THRESHOLD) {
      // Ensure closing animation matches overlay duration (300ms)
      modalElement.style.transition = 'transform 0.3s ease-in-out'; // CHANGED back to 0.3s
      // Animate smoothly down to 100% translateY using the transition
      modalElement.style.transform = 'translateY(100%)';
      backgroundElement.style.backgroundColor = 'rgba(0, 0, 0, 0.0)';
      
      // Delay the actual onClose call until the animation finishes (300ms)
      setTimeout(() => {
        onClose();
        // No need to reset currentTranslateY or transform here, 
        // the useEffect hooks triggered by isOpen changing will handle it.
      }, 300); // Match overlay CSS transition duration (CHANGED back to 300)
      
    } else {
      // Snap back to the open position (top) - uses the 300ms transition set above
      modalElement.style.transform = 'translateY(0px)';
      setCurrentTranslateY(0); // Reset drag state immediately
      
      // Clean up inline styles *after* the snap-back animation completes (still 300ms)
      setTimeout(() => {
        // Check if the modal still exists and is still snapped back before clearing.
        // Avoids clearing styles if another interaction (like closing) happened quickly.
        if (modalElement && modalElement.style.transform === 'translateY(0px)') { 
           modalElement.style.transform = ''; // Remove inline transform
           modalElement.style.transition = ''; // Remove inline transition too
         }
      }, 300); // Match SLOWER (snap-back) CSS transition duration (Unchanged at 300)
    }
  }, [currentTranslateY, onClose]);

  return (
    <div
      className={`fixed inset-0 bg-black z-40 
        ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ opacity: 100 }} // Start with opacity 0
      // Close on overlay click (optional, could be a prop)
      onClick={onClose} 
      ref={modalBackgroundRef}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()} // Prevent overlay click from closing when clicking sheet
        // Attach pointer handlers to the main sheet container
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        // Add touch-action to prevent browser interference when dragging the sheet
        style={{ touchAction: isDragging.current ? 'none' : 'auto' }}
        className={`fixed bottom-0 left-0 right-0 bg-background w-full max-w-lg mx-auto shadow-xl h-[95vh] flex flex-col rounded-t-xl
                   transition-transform duration-300 ease-in-out z-50
                   ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        // Inline transform applied during drag
      >
        {/* Drag Handle Area - Only visual now, but used for hit-testing in handlePointerDown */}
        <div
            // Pointer handlers are removed from here
            data-drag-handle="true" // Identifier for the handle
            className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-6 pt-3 flex justify-center cursor-grab touch-none z-10"
        >
            <div className="w-10 h-1.5 bg-muted rounded-full pointer-events-none"></div> {/* Prevent pointer events on inner div */}
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-hidden flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

export default DraggableBottomSheet; 