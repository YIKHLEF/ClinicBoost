/**
 * Touch Gesture Handler Component
 * 
 * Provides comprehensive touch gesture support for mobile devices including:
 * - Swipe gestures (left, right, up, down)
 * - Pinch to zoom
 * - Long press
 * - Double tap
 * - Pan and drag
 * - Touch feedback
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { deviceDetection } from '../../lib/mobile/device-detection';

export interface TouchGestureConfig {
  enableSwipe?: boolean;
  enablePinch?: boolean;
  enableLongPress?: boolean;
  enableDoubleTap?: boolean;
  enablePan?: boolean;
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  pinchThreshold?: number;
  panThreshold?: number;
}

export interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: (scale: number) => void;
  onPinchOut?: (scale: number) => void;
  onLongPress?: (event: TouchEvent) => void;
  onDoubleTap?: (event: TouchEvent) => void;
  onPanStart?: (event: TouchEvent) => void;
  onPanMove?: (event: TouchEvent, deltaX: number, deltaY: number) => void;
  onPanEnd?: (event: TouchEvent) => void;
  onTouchStart?: (event: TouchEvent) => void;
  onTouchEnd?: (event: TouchEvent) => void;
}

interface TouchGestureHandlerProps {
  children: React.ReactNode;
  config?: TouchGestureConfig;
  callbacks?: GestureCallbacks;
  className?: string;
  disabled?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

const defaultConfig: TouchGestureConfig = {
  enableSwipe: true,
  enablePinch: true,
  enableLongPress: true,
  enableDoubleTap: true,
  enablePan: true,
  swipeThreshold: 50,
  longPressDelay: 500,
  doubleTapDelay: 300,
  pinchThreshold: 0.1,
  panThreshold: 10,
};

export const TouchGestureHandler: React.FC<TouchGestureHandlerProps> = ({
  children,
  config = {},
  callbacks = {},
  className = '',
  disabled = false,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const gestureConfig = { ...defaultConfig, ...config };
  
  // Touch state
  const [touchState, setTouchState] = useState({
    isTouch: false,
    startPoint: null as TouchPoint | null,
    lastTap: null as TouchPoint | null,
    longPressTimer: null as NodeJS.Timeout | null,
    isPanning: false,
    initialDistance: 0,
    lastScale: 1,
  });

  // Check if device supports touch
  const isTouchDevice = deviceDetection.getDeviceInfo().viewport.isTouch;

  /**
   * Get touch coordinates
   */
  const getTouchPoint = useCallback((touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now(),
  }), []);

  /**
   * Calculate distance between two points
   */
  const getDistance = useCallback((point1: TouchPoint, point2: TouchPoint): number => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  /**
   * Calculate distance between two touches
   */
  const getTouchDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  /**
   * Determine swipe direction
   */
  const getSwipeDirection = useCallback((start: TouchPoint, end: TouchPoint): string | null => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = getDistance(start, end);

    if (distance < gestureConfig.swipeThreshold!) return null;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }, [gestureConfig.swipeThreshold, getDistance]);

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (disabled || !isTouchDevice) return;

    const touch = event.touches[0];
    const touchPoint = getTouchPoint(touch);

    // Clear any existing long press timer
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
    }

    // Set up long press timer
    let longPressTimer: NodeJS.Timeout | null = null;
    if (gestureConfig.enableLongPress && callbacks.onLongPress) {
      longPressTimer = setTimeout(() => {
        callbacks.onLongPress!(event);
        // Add haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, gestureConfig.longPressDelay);
    }

    // Check for double tap
    if (gestureConfig.enableDoubleTap && callbacks.onDoubleTap && touchState.lastTap) {
      const timeDiff = touchPoint.timestamp - touchState.lastTap.timestamp;
      const distance = getDistance(touchPoint, touchState.lastTap);
      
      if (timeDiff < gestureConfig.doubleTapDelay! && distance < 30) {
        callbacks.onDoubleTap(event);
        setTouchState(prev => ({ ...prev, lastTap: null }));
        return;
      }
    }

    // Handle pinch start
    if (gestureConfig.enablePinch && event.touches.length === 2) {
      const distance = getTouchDistance(event.touches[0], event.touches[1]);
      setTouchState(prev => ({
        ...prev,
        initialDistance: distance,
        lastScale: 1,
      }));
    }

    setTouchState(prev => ({
      ...prev,
      isTouch: true,
      startPoint: touchPoint,
      longPressTimer,
      isPanning: false,
    }));

    callbacks.onTouchStart?.(event);
  }, [disabled, isTouchDevice, gestureConfig, callbacks, touchState.longPressTimer, touchState.lastTap, getTouchPoint, getDistance, getTouchDistance]);

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (disabled || !isTouchDevice || !touchState.startPoint) return;

    const touch = event.touches[0];
    const currentPoint = getTouchPoint(touch);

    // Clear long press timer on move
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
      setTouchState(prev => ({ ...prev, longPressTimer: null }));
    }

    // Handle pinch gesture
    if (gestureConfig.enablePinch && event.touches.length === 2 && touchState.initialDistance > 0) {
      const currentDistance = getTouchDistance(event.touches[0], event.touches[1]);
      const scale = currentDistance / touchState.initialDistance;
      const scaleDiff = Math.abs(scale - touchState.lastScale);

      if (scaleDiff > gestureConfig.pinchThreshold!) {
        if (scale > touchState.lastScale) {
          callbacks.onPinchOut?.(scale);
        } else {
          callbacks.onPinchIn?.(scale);
        }
        setTouchState(prev => ({ ...prev, lastScale: scale }));
      }
      return;
    }

    // Handle pan gesture
    if (gestureConfig.enablePan && event.touches.length === 1) {
      const distance = getDistance(touchState.startPoint, currentPoint);
      
      if (!touchState.isPanning && distance > gestureConfig.panThreshold!) {
        setTouchState(prev => ({ ...prev, isPanning: true }));
        callbacks.onPanStart?.(event);
      }

      if (touchState.isPanning) {
        const deltaX = currentPoint.x - touchState.startPoint.x;
        const deltaY = currentPoint.y - touchState.startPoint.y;
        callbacks.onPanMove?.(event, deltaX, deltaY);
      }
    }
  }, [disabled, isTouchDevice, touchState, gestureConfig, callbacks, getTouchPoint, getDistance, getTouchDistance]);

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (disabled || !isTouchDevice) return;

    // Clear long press timer
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
    }

    // Handle pan end
    if (touchState.isPanning) {
      callbacks.onPanEnd?.(event);
    }

    // Handle swipe gesture
    if (gestureConfig.enableSwipe && touchState.startPoint && !touchState.isPanning) {
      const touch = event.changedTouches[0];
      const endPoint = getTouchPoint(touch);
      const direction = getSwipeDirection(touchState.startPoint, endPoint);

      switch (direction) {
        case 'left':
          callbacks.onSwipeLeft?.();
          break;
        case 'right':
          callbacks.onSwipeRight?.();
          break;
        case 'up':
          callbacks.onSwipeUp?.();
          break;
        case 'down':
          callbacks.onSwipeDown?.();
          break;
      }
    }

    // Store last tap for double tap detection
    if (touchState.startPoint && !touchState.isPanning) {
      setTouchState(prev => ({ ...prev, lastTap: touchState.startPoint }));
    }

    setTouchState(prev => ({
      ...prev,
      isTouch: false,
      startPoint: null,
      longPressTimer: null,
      isPanning: false,
      initialDistance: 0,
      lastScale: 1,
    }));

    callbacks.onTouchEnd?.(event);
  }, [disabled, isTouchDevice, touchState, gestureConfig, callbacks, getTouchPoint, getSwipeDirection]);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !isTouchDevice) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isTouchDevice]);

  return (
    <div
      ref={elementRef}
      className={`touch-gesture-handler ${className}`}
      style={{
        touchAction: disabled ? 'auto' : 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {children}
    </div>
  );
};

export default TouchGestureHandler;
