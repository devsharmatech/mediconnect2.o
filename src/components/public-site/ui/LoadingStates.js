'use client';

import { FaHeartbeat } from 'react-icons/fa';

/**
 * Premium full-page loading screen for patient portal
 * Usage: <LoadingScreen message="Loading your dashboard..." />
 */
export function LoadingScreen({ message = 'Loading...', submessage = '' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 sm:py-32 gap-5">
      {/* Animated logo pulse */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0067A1] to-teal-500 flex items-center justify-center shadow-lg shadow-[#0067A1]/20 animate-pulse">
          <FaHeartbeat className="w-7 h-7 text-white" />
        </div>
        {/* Orbiting dot */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-teal-400 rounded-full shadow-sm shadow-teal-300" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#0067A1] to-teal-400 rounded-full"
          style={{
            animation: 'loadingBar 1.8s ease-in-out infinite',
          }}
        />
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">{message}</p>
        {submessage && (
          <p className="text-xs text-gray-400 mt-1">{submessage}</p>
        )}
      </div>

      <style jsx>{`
        @keyframes loadingBar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

/**
 * Skeleton card for list/grid loading states
 * Usage: <SkeletonCard /> or <SkeletonCard lines={4} />
 */
export function SkeletonCard({ lines = 3, hasImage = false, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 animate-pulse ${className}`}>
      <div className="flex items-start gap-4">
        {hasImage && (
          <div className="w-12 h-12 bg-gray-100 rounded-xl shrink-0" />
        )}
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <div
              key={i}
              className="h-3 bg-gray-50 rounded-lg"
              style={{ width: `${60 + Math.random() * 30}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton row for table/list loading
 * Usage: <SkeletonRow />
 */
export function SkeletonRow({ columns = 4 }) {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-gray-100 rounded-lg"
          style={{ width: `${20 + Math.random() * 15}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Dashboard skeleton with hero + cards
 * Usage: <DashboardSkeleton />
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-[#0067A1]/80 via-[#0080C6]/80 to-[#0067A1]/80 rounded-3xl px-6 pt-6 pb-14 mb-6">
        <div className="space-y-3">
          <div className="h-3 bg-white/20 rounded w-24" />
          <div className="h-7 bg-white/20 rounded w-48" />
          <div className="h-3 bg-white/10 rounded w-56" />
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div className="mb-8">
        <div className="h-5 bg-gray-100 rounded w-32 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-11 h-11 bg-gray-100 rounded-xl mb-3" />
              <div className="h-3.5 bg-gray-100 rounded w-20 mb-1.5" />
              <div className="h-2.5 bg-gray-50 rounded w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Banner skeleton */}
      <div className="bg-gray-100 rounded-2xl h-28 mb-8" />

      {/* Health programs skeleton */}
      <div className="mb-8">
        <div className="h-5 bg-gray-100 rounded w-36 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-rose-50 rounded-xl" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-100 rounded w-28" />
                <div className="h-3 bg-gray-50 rounded w-40" />
              </div>
            </div>
            <div className="h-10 bg-gray-50 rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-teal-50 rounded-xl" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-100 rounded w-28" />
                <div className="h-3 bg-gray-50 rounded w-40" />
              </div>
            </div>
            <div className="h-10 bg-gray-50 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline spinner for buttons and small areas
 * Usage: <InlineSpinner /> or <InlineSpinner size="lg" color="white" />
 */
export function InlineSpinner({ size = 'sm', color = 'teal' }) {
  const sizes = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[3px]',
  };

  const colors = {
    teal: 'border-[#0067A1]/20 border-t-[#0067A1]',
    white: 'border-white/30 border-t-white',
    gray: 'border-gray-200 border-t-gray-500',
  };

  return (
    <div className={`${sizes[size]} ${colors[color]} rounded-full animate-spin`} />
  );
}

/**
 * Content loading shimmer for text areas
 * Usage: <ContentShimmer lines={5} />
 */
export function ContentShimmer({ lines = 5 }) {
  return (
    <div className="space-y-3 py-10 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-gray-100 rounded-lg"
          style={{
            width: i === lines - 1 ? '45%' : `${75 + Math.random() * 25}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
