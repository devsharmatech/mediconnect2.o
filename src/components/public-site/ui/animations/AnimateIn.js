'use client';

import { useEffect, useRef, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const AnimateIn = forwardRef(({ 
  children, 
  delay = 0, 
  className = '',
  animation = 'fadeInUp',
  duration = 700,
  threshold = 0.1,
  ...props 
}, ref) => {
  const elementRef = useRef(null);
  const animationRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const startAnimation = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      animationRef.current = requestAnimationFrame(() => {
        element.style.animation = `${animation} ${duration}ms forwards`;
        element.style.animationDelay = `${delay}ms`;
      });
    };

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation();
          observerRef.current?.unobserve(entry.target);
        }
      },
      { threshold }
    );

    observerRef.current.observe(element);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [animation, delay, duration, threshold]);

  return (
    <div
      ref={(node) => {
        elementRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      className={twMerge(
        'opacity-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

AnimateIn.displayName = 'AnimateIn';

export default AnimateIn;
