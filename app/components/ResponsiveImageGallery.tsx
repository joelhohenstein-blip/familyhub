import React, { useState } from 'react';
import { OptimizedImage } from './OptimizedImage';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface GalleryImage {
  id: string;
  src: string;
  srcset?: string;
  srcsetWebp?: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
}

export interface ResponsiveImageGalleryProps {
  images: GalleryImage[];
  columns?: number;
  gap?: string;
  enableLightbox?: boolean;
  className?: string;
}

/**
 * ResponsiveImageGallery Component
 * Displays optimized images in a responsive grid with optional lightbox
 */
export const ResponsiveImageGallery: React.FC<ResponsiveImageGalleryProps> = ({
  images,
  columns = 3,
  gap = '1rem',
  enableLightbox = true,
  className = '',
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImage = images[currentImageIndex];

  return (
    <>
      <div
        className={className}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(300px, 1fr))`,
          gap,
        }}
      >
        {images.map((image) => (
          <div
            key={image.id}
            className="relative overflow-hidden rounded-lg bg-muted cursor-pointer group"
            onClick={() => {
              if (enableLightbox) {
                setCurrentImageIndex(images.indexOf(image));
                setLightboxOpen(true);
              }
            }}
            style={{
              aspectRatio: image.width && image.height ? `${image.width} / ${image.height}` : '1',
            }}
          >
            <OptimizedImage
              src={image.src}
              srcset={image.srcset}
              srcsetWebp={image.srcsetWebp}
              alt={image.alt}
              width={image.width}
              height={image.height}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {image.title && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end p-4">
                <h3 className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {image.title}
                </h3>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {enableLightbox && lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <X size={32} />
          </button>

          <button
            onClick={handlePrevious}
            className="absolute left-4 text-white hover:text-gray-300"
          >
            <ChevronLeft size={32} />
          </button>

          <div className="max-w-4xl max-h-[90vh] flex items-center justify-center">
            <OptimizedImage
              src={currentImage.src}
              srcset={currentImage.srcset}
              srcsetWebp={currentImage.srcsetWebp}
              alt={currentImage.alt}
              width={currentImage.width}
              height={currentImage.height}
              className="max-w-full max-h-full object-contain"
              loading="eager"
            />
          </div>

          <button
            onClick={handleNext}
            className="absolute right-4 text-white hover:text-gray-300"
          >
            <ChevronRight size={32} />
          </button>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {currentImageIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
};

export default ResponsiveImageGallery;
