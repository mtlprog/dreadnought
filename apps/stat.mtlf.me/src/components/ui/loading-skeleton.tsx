"use client";

import React from "react";

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className = "" }: LoadingSkeletonProps) {
  return <div className={`bg-steel-gray/20 animate-pulse ${className}`} />;
}

interface LoadingTableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function LoadingTableSkeleton({ rows = 5, columns = 6 }: LoadingTableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="grid grid-cols-6 gap-4 pb-4 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => <LoadingSkeleton key={i} className="h-6 w-full" />)}
      </div>

      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-6 gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton key={colIndex} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface FundStructureLoadingProps {
  accountCount?: number;
}

export function FundStructureLoading({ accountCount = 3 }: FundStructureLoadingProps) {
  return (
    <div className="space-y-8">
      <div className="p-0 border-0 bg-card text-card-foreground overflow-hidden">
        {/* Header */}
        <div className="bg-cyber-green/20 border border-cyber-green p-6 animate-pulse">
          <div className="bg-cyber-green/40 h-8 w-96 mb-2"></div>
          <div className="bg-cyber-green/30 h-6 w-64"></div>
        </div>

        <div className="p-6">
          {/* Table Header */}
          <div className="mb-6">
            <div className="grid grid-cols-6 gap-4 pb-4 border-b border-border">
              {Array.from({ length: 6 }).map((_, i) => <LoadingSkeleton key={i} className="h-6" />)}
            </div>
          </div>

          {/* Account Sections */}
          <div className="space-y-6">
            {Array.from({ length: accountCount }).map((_, accountIndex) => (
              <div key={accountIndex} className="space-y-2">
                {/* Account Header */}
                <div className="bg-steel-gray/20 p-4 border-l-4 border-cyber-green animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <LoadingSkeleton className="h-6 w-48" />
                        <LoadingSkeleton className="h-4 w-20" />
                      </div>
                      <LoadingSkeleton className="h-4 w-64" />
                      <LoadingSkeleton className="h-3 w-32" />
                    </div>
                    <div className="text-right space-y-2">
                      <LoadingSkeleton className="h-4 w-24 ml-auto" />
                      <LoadingSkeleton className="h-6 w-32 ml-auto" />
                      <LoadingSkeleton className="h-4 w-28 ml-auto" />
                    </div>
                  </div>
                </div>

                {/* Token rows */}
                <div className="ml-4">
                  <LoadingTableSkeleton rows={3} columns={6} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-4 border-cyber-green bg-cyber-green/20 p-6 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <LoadingSkeleton className="h-8 w-64" />
              <LoadingSkeleton className="h-4 w-48" />
            </div>
            <div className="flex space-x-12">
              <div className="text-right space-y-2">
                <LoadingSkeleton className="h-4 w-24 ml-auto" />
                <LoadingSkeleton className="h-10 w-32 ml-auto" />
              </div>
              <div className="text-right space-y-2">
                <LoadingSkeleton className="h-4 w-20 ml-auto" />
                <LoadingSkeleton className="h-10 w-36 ml-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SystemLoadingProps {
  title?: string;
  subtitle?: string;
  progress?: number;
  statusMessages?: readonly string[];
  rateLimitWarning?: boolean;
}

export function SystemLoading({
  title = "ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ",
  subtitle = "Подключение к Stellar Network...",
  progress = 0,
  statusMessages,
  rateLimitWarning = false,
}: SystemLoadingProps) {
  // Default status messages if none provided
  const defaultMessages = [
    "✓ STELLAR HORIZON CONNECTED",
    "✓ ACCOUNT DATA LOADING",
    "⏳ PRICE CALCULATION IN PROGRESS",
  ];

  const messages = statusMessages ?? defaultMessages;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Terminal-style loading indicator */}
        <div className="border-2 border-cyber-green bg-card p-8">
          <div className="font-mono text-4xl text-cyber-green uppercase tracking-wider mb-4">
            {title}
          </div>

          <div className="font-mono text-lg text-steel-gray mb-8">
            {subtitle}
          </div>

          {/* Progress bar */}
          <div className="border border-border bg-background h-4 mb-6">
            <div
              className="bg-cyber-green h-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Rate limit warning */}
          {rateLimitWarning && (
            <div className="mb-6 border-2 border-warning-amber bg-warning-amber/10 p-4">
              <div className="font-mono text-warning-amber text-sm uppercase tracking-wider">
                ⚠ RATE LIMIT DETECTED
              </div>
              <div className="font-mono text-xs text-steel-gray mt-1">
                Stellar API rate limit encountered. Retrying with exponential backoff...
              </div>
            </div>
          )}

          {/* Animated dots */}
          <div className="flex justify-center items-center space-x-2">
            <div className="font-mono text-cyber-green text-2xl">
              {"⣀⣄⣤⣦⣶⣷⣿".split("").map((char, i) => (
                <span
                  key={i}
                  className="inline-block animate-pulse"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: "1.6s",
                  }}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>

          {/* System status */}
          <div className="mt-6 space-y-2 text-left font-mono text-sm max-h-48 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.startsWith("✓")
                    ? "text-cyber-green"
                    : message.startsWith("⚠")
                      ? "text-warning-amber"
                      : message.startsWith("❌")
                        ? "text-red-500"
                        : "text-steel-gray"
                }
              >
                {message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
