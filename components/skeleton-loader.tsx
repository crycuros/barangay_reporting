"use client"

import { cn } from "@/lib/utils"

export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer",
        className
      )}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-muted p-6 space-y-4">
      <SkeletonLoader className="h-6 w-1/3" />
      <div className="space-y-3">
        <SkeletonLoader className="h-4 w-full" />
        <SkeletonLoader className="h-4 w-5/6" />
        <SkeletonLoader className="h-4 w-4/6" />
      </div>
    </div>
  )
}

export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full max-w-6xl mx-auto flex h-14 sm:h-16 items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <SkeletonLoader className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg" />
          <div className="hidden sm:flex flex-col gap-2">
            <SkeletonLoader className="h-4 w-32" />
            <SkeletonLoader className="h-3 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SkeletonLoader className="h-8 w-20" />
          <SkeletonLoader className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </header>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="h-8 w-48" />
          <SkeletonLoader className="h-4 w-64" />
        </div>
        <SkeletonLoader className="h-10 w-32" />
      </div>

      {/* Cards skeleton */}
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Table-like skeleton */}
      <div className="rounded-lg border border-muted p-6 space-y-4">
        <SkeletonLoader className="h-6 w-1/4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <SkeletonLoader className="h-4 w-1/2" />
              <SkeletonLoader className="h-4 w-1/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
