import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiX } from 'react-icons/fi';

interface DraggableBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number; // Optional z-index prop with default value
  title?: string; // Optional title for the bottom sheet
  // Optional: Add props for customizing height, initial snap point, etc. later
}

const DRAG_THRESHOLD = 100; // Pixels to drag down before closing

function DraggableBottomSheet({
  isOpen,
  onClose,
  children,
  zIndex = 40, // Default z-index is 40
  title, // Destructure the new title prop
}: DraggableBottomSheetProps) {
  const [currentTranslateY, setCurrentTranslateY] = useState(0); // Tracks drag offset
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalBackgroundRef = useRef<HTMLDivElement>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref to store the visibility timeout ID

  const animationDuration = 300;

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


  // Effect to manage background visibility with timeout handling
  useEffect(() => {
    const backgroundElement = modalBackgroundRef.current;
    if (!backgroundElement) return;

    // Clear any existing timeout when isOpen changes or component unmounts
    if (visibilityTimeoutRef.current) {
      clearTimeout(visibilityTimeoutRef.current);
      visibilityTimeoutRef.current = null;
    }

    if (isOpen) {
      // Make visible immediately when opening
      backgroundElement.style.visibility = 'visible';
    } else {
      // Set a timeout to hide the background after the animation duration
      visibilityTimeoutRef.current = setTimeout(() => {
        backgroundElement.style.visibility = 'hidden';
        visibilityTimeoutRef.current = null; // Clear the ref after timeout executes
      }, animationDuration);
    }

    // Cleanup function to clear timeout on unmount or if isOpen changes again
    return () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
    };
  }, [isOpen, animationDuration]); // Rerun effect if isOpen or animationDuration changes


  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only allow dragging if the event target is the drag handle itself or within it
    const handleElement = e.currentTarget.querySelector('[data-drag-handle="true"]');
    const isDragHandle = handleElement?.contains(e.target as Node);

    if (isDragHandle && modalRef.current) {
      isDragging.current = true;
      dragStartY.current = e.clientY;
      modalRef.current.style.transition = 'none'; // Disable transition during drag
      // Capture pointer on the element that received the event (the modal div)
      // Use e.currentTarget which is the modal div itself where the listener is attached
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    // If not the drag handle, do nothing. Native behavior (like text selection) is allowed.

  }, []); // No dependencies needed

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
      modalElement.style.transition = `transform ${animationDuration}ms ease-in-out`;
      modalElement.style.transform = 'translateY(100%)';
      // Ensure background also animates out
      backgroundElement.style.transition = `background-color ${animationDuration}ms ease-in-out`;
      backgroundElement.style.backgroundColor = 'rgba(0, 0, 0, 0.0)';

      // Call onClose after the animation finishes
      setTimeout(() => {
        onClose();
        // No need to reset styles here; the main useEffect hook triggered
        // by the 'isOpen' change will now handle clearing inline styles.
      }, animationDuration); // Match transform animation duration

    } else {
      // Snap back to the open position (top)
      modalElement.style.transition = `transform ${animationDuration}ms ease-in-out`;
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
      }, animationDuration); // Match snap-back animation duration
    }
    // No need to reset touchAction here, handled by style attribute binding
  }, [currentTranslateY, onClose, isOpen, animationDuration]); // Added isOpen and animationDuration dependency

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 transition-opacity duration-${animationDuration} ease-in-out
        ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ zIndex: zIndex, visibility: 'hidden' }} // Apply z-index to background, visibility handled by effect
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
          zIndex: zIndex + 10, // Make the sheet 10 higher than the background
          boxShadow: '0 0 32px 0 rgba(0,0,0,0.25)', // Large shadow all around
        }}
        className={`fixed bottom-0 left-0 right-0 border-[0.7px] border-border bg-background w-full max-w-lg mx-auto h-[95%] flex flex-col rounded-t-xl
                   transition-transform duration-${animationDuration} ease-in-out
                   ${isOpen ? 'translate-y-0' : 'translate-y-[100%]'}
                   `}
        // Inline transform applied during drag
      >
        {/* Drag Handle Area - Now includes title */}
        <div
          data-drag-handle="true" // Identifier for the handle
          className="absolute top-0 left-0 right-0 w-full pt-3 flex flex-col items-center cursor-grab touch-none z-10" // Increased height for title
        >
          <div className="transform w-full h-3.5 flex justify-center">
            <div className="w-12 h-2 bg-input rounded-full pointer-events-none"></div> {/* Added margin-bottom */}
          </div>

          {title && <h2 className="text-lg font-semibold text-foreground pointer-events-none">{title}</h2>} {/* Display title if provided */}

          {/* Close Button */}
          <div className="absolute right-0 top-1 bottom-0 py-2 px-4 h-full flex items-center justify-center">
            <div
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering handle's pointer events
              onClose();
            }}
            className="p-2 rounded-full cursor-pointer text-primary bg-input" // Positioned top right, interactive
            aria-label="Close bottom sheet"
          >
              <FiX className="text-xl font-bold leading-none" /> {/* Simple text 'X' character */}
            </div>
          </div>
        </div>

        {/* Content Area - Added padding-top to avoid overlap with handle */}
        <div className="flex-grow overflow-hidden flex flex-col rounded-t-xl pt-16">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default DraggableBottomSheet; 