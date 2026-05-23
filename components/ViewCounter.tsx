"use client";

import { useEffect, useRef } from "react";

interface ViewCounterProps {
  slug: string;
}

/**
 * ViewCounter Component
 * 
 * Increments the view count for a post when the page loads.
 * Uses sessionStorage to prevent duplicate increments within the same session.
 * 
 * Features:
 * - One increment per session per post
 * - Fire and forget API call (no blocking)
 * - Handles network errors gracefully
 * - Works with Server Components
 */
export function ViewCounter({ slug }: ViewCounterProps) {
  const hasCountedRef = useRef(false);

  useEffect(() => {
    // Prevent race condition: Only count once per component mount
    if (hasCountedRef.current) return;
    hasCountedRef.current = true;

    // Check if already counted in this session
    const storageKey = `view_counted_${slug}`;
    const alreadyCounted = sessionStorage.getItem(storageKey);

    if (alreadyCounted) {
      // Already counted this post in this session, don't increment again
      return;
    }

    // Mark as counted for this session
    sessionStorage.setItem(storageKey, "true");

    // Call view increment API (fire and forget)
    const incrementView = async () => {
      try {
        // Use async/await for clean error handling
        const response = await fetch(`/api/posts/slug/${encodeURIComponent(slug)}/view`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        // Log errors but don't throw (fire and forget pattern)
        if (!response.ok) {
          console.warn(
            `Failed to increment view count for "${slug}": HTTP ${response.status}`
          );
          return;
        }

        const data = await response.json();
        console.debug(`View counted for "${slug}": ${data.views} total views`);
      } catch (error) {
        // Network error or JSON parse error - log and continue
        console.warn(
          `Error incrementing view count for "${slug}":`,
          error instanceof Error ? error.message : String(error)
        );
        // Don't re-throw - this shouldn't block the user experience
      }
    };

    // Execute async function
    incrementView();
  }, [slug]);

  // This component doesn't render anything - it's just for side effects
  return null;
}
