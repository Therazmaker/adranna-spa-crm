import React from 'react';

const LOGO_W = 978;
const LOGO_H = 831;

/**
 * Logo oficial de Adranna Spa (public/brand/logo.png, fondo transparente).
 * - variant="full": logo completo (emblema + nombre). `size` = ancho en px.
 * - variant="emblem": solo el emblema circular (recorte por CSS). `size` = lado en px.
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
    // Región del emblema en la imagen original: centro (445, 285), lado ~640
    const side = 640;
    const scale = size / side;
    return (
      <span
        role="img"
        aria-label="Adranna Spa"
        className={`inline-block flex-shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          backgroundImage: 'url(/brand/logo.png)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${LOGO_W * scale}px ${LOGO_H * scale}px`,
          backgroundPosition: `${-(445 - side / 2) * scale}px ${-(285 - side / 2) * scale}px`,
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo.png"
      alt="Adranna Spa"
      width={size}
      height={Math.round((size * LOGO_H) / LOGO_W)}
      className={`object-contain ${className}`}
      style={{ width: size, height: 'auto' }}
    />
  );
}
