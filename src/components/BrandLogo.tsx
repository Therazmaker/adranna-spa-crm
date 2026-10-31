import React from 'react';

/**
 * Logo oficial de Adranna Spa (public/brand/logo.jpg).
 * - variant="full": logo completo (emblema + nombre).
 * - variant="emblem": solo el emblema circular (recorte por CSS).
 * mix-blend-multiply funde el fondo crema del JPG con la superficie de la app.
 */
export default function BrandLogo({
  variant = 'full',
  size = 160,
  className = '',
}: {
  variant?: 'full' | 'emblem';
  size?: number;
  className?: string;
}) {
  if (variant === 'emblem') {
    // Región del emblema en la imagen original de 1024x1024: centro (485, 392), ancho ~430
    const scale = size / 430;
    const bg = 1024 * scale;
    return (
      <span
        role="img"
        aria-label="Adranna Spa"
        className={`inline-block flex-shrink-0 mix-blend-multiply ${className}`}
        style={{
          width: size,
          height: size,
          backgroundImage: 'url(/brand/logo.jpg)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${bg}px ${bg}px`,
          backgroundPosition: `${-(485 - 215) * scale}px ${-(392 - 215) * scale}px`,
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo.jpg"
      alt="Adranna Spa"
      width={size}
      height={size}
      className={`mix-blend-multiply object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
