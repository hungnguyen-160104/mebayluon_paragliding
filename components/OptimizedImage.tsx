// components/OptimizedImage.tsx
/**
 * Optimized image component for Cloudinary images
 * Automatically handles responsive sizing, lazy loading, and format negotiation
 */

'use client';

import Image from 'next/image';
import { CSSProperties } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  quality?: 70 | 75 | 80 | 85 | 90;
  sizes?: string;
  style?: CSSProperties;
  onLoad?: () => void;
  loader?: (props: { src: string; width: number; quality?: number }) => string;
}

/**
 * Cloudinary transformation URL builder
 */
function buildCloudinaryUrl(
  src: string,
  { width, quality = 80 }: { width?: number; quality?: number }
): string {
  // If not a Cloudinary URL, return as-is
  if (!src.includes('cloudinary.com')) {
    return src;
  }

  // Remove width and quality params if they exist
  let url = src.replace(/\/w_\d+/g, '').replace(/\/q_\d+/g, '');

  // Build transformation URL
  const params: string[] = [];

  if (width) {
    params.push(`w_${width}`);
    params.push('c_limit'); // Limit to max width, don't upscale
  }

  if (quality) {
    params.push(`q_auto:low,q_${quality}`); // Auto quality optimization
  }

  if (params.length === 0) return url;

  // Insert transformation into Cloudinary URL
  const [base, path] = url.split('/upload/');
  if (!path) return url;

  return `${base}/upload/${params.join(',')}/${path}`;
}

/**
 * Custom Next.js Image loader for Cloudinary
 */
function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return buildCloudinaryUrl(src, { width, quality });
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  objectFit = 'cover',
  quality = 80,
  sizes,
  style,
  onLoad,
  loader,
}: OptimizedImageProps) {
  // Determine if we should use Next.js Image optimization
  const isCloudinary = src.includes('cloudinary.com');
  const isAbsolute = src.startsWith('http');

  // For Cloudinary images, use custom loader
  // For other external images, skip Next Image optimization to avoid CORS issues
  if (isAbsolute && !isCloudinary) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{
          objectFit,
          ...style,
        }}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={onLoad}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 1200}
      height={height || 630}
      priority={priority}
      quality={quality}
      className={className}
      sizes={
        sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 1200px'
      }
      style={{
        objectFit,
        ...style,
      }}
      loader={isCloudinary ? cloudinaryLoader : loader}
      onLoad={onLoad}
    />
  );
}
