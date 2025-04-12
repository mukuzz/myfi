import React, { useState, useRef, useCallback, useEffect } from 'react';

interface DraggableBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number; // Optional z-index prop with default value
  // Optional: Add props for customizing height, initial snap point, etc. later
}

const DRAG_THRESHOLD = 100; // Pixels to drag down before closing

function DraggableBottomSheet({
  isOpen,
  onClose,
  children,
  zIndex = 40, // Default z-index is 40
}: DraggableBottomSheetProps) {
  const [currentTranslateY, setCurrentTranslateY] = useState(0); // Tracks drag offset
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalBackgroundRef = useRef<HTMLDivElement>(null);

  // Reset state and manage inline styles based on isOpen
  useEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;

    if (isOpen) {
      // When opening, clear any inline transform/transition
      // so the CSS class 'translate-y-0' controls the animation.
      modalElement.style.transform = '';
      modalElement.style.transition = '';
      setCurrentTranslateY(0); // Ensure drag state is reset
    } else {
      // When closing (either via drag or externally),
      // clear inline styles and reset drag state.
      // The CSS class 'translate-y-full' will handle the closed position.
      setCurrentTranslateY(0);
      // Clear styles immediately. If closing animation was running,
      // this ensures the CSS class takes over cleanly.
      modalElement.style.transition = '';
      modalElement.style.transform = '';
    }
    // We only need this one effect reacting to isOpen for style cleanup.
  }, [isOpen]);

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
    
    // Decide whether to close or snap back based on drag distance
    if (currentTranslateY > DRAG_THRESHOLD) {
      // Animate smoothly down using inline styles
      modalElement.style.transition = 'transform 0.3s ease-in-out';
      modalElement.style.transform = 'translateY(100%)';
      // Ensure background also animates out
      backgroundElement.style.transition = 'background-color 0.2s ease-in-out';
      backgroundElement.style.backgroundColor = 'rgba(0, 0, 0, 0.0)';

      // Call onClose after the animation finishes
      setTimeout(() => {
        onClose();
        // No need to reset styles here; the main useEffect hook triggered
        // by the 'isOpen' change will now handle clearing inline styles.
      }, 300); // Match transform animation duration

    } else {
      // Snap back to the open position (top)
      modalElement.style.transition = 'transform 0.3s ease-in-out';
      modalElement.style.transform = 'translateY(0px)';
      setCurrentTranslateY(0); // Reset drag state immediately

      // Clean up inline styles *after* the snap-back animation completes
      setTimeout(() => {
        // Check if the modal still exists and is still open before clearing.
        // Avoids clearing styles if another interaction (like closing) happened quickly.
        if (modalElement && isOpen && modalElement.style.transform === 'translateY(0px)') {
           modalElement.style.transform = '';
           modalElement.style.transition = '';
         }
      }, 300); // Match snap-back animation duration
    }
    // No need to reset touchAction here, handled by style attribute binding
  }, [currentTranslateY, onClose, isOpen]); // Added isOpen dependency

  return (
    <div
      className={`fixed inset-0 bg-black
        ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ opacity: 100, zIndex: zIndex }} // Apply z-index to background
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
        style={{ 
          touchAction: isDragging.current ? 'none' : 'auto',
          zIndex: zIndex + 10 // Make the sheet 10 higher than the background
        }}
        className={`fixed bottom-0 left-0 right-0 bg-background w-full max-w-lg mx-auto shadow-xl h-[95vh] flex flex-col rounded-t-xl
                   transition-transform duration-300 ease-in-out
                   ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        // Inline transform applied during drag
      >
        {/* Drag Handle Area - Only visual now, but used for hit-testing in handlePointerDown */}
        <div
            // Pointer handlers are removed from here
            data-drag-handle="true" // Identifier for the handle
            className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-6 pt-3 flex justify-center cursor-grab touch-none z-10"
        >
            <div className="w-10 h-1.5 bg-input rounded-full pointer-events-none"></div> {/* Prevent pointer events on inner div */}
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-hidden flex flex-col rounded-t-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

export default DraggableBottomSheet; 