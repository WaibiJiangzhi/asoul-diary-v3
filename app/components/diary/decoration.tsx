import Image from 'next/image';
import { getSticker } from '@/lib/stickers';

export function isSticker(value: string) {
  return !!getSticker(value) || value.startsWith('/stickers/');
}

export function Decoration({
  value,
  className,
  alt = '',
}: {
  value: string;
  className?: string;
  alt?: string;
}) {
  if (!value) return null;

  if (isSticker(value)) {
    return (
      <span className={className} data-decoration="sticker">
        <Image
          src={getSticker(value)?.src ?? value}
          alt={getSticker(value)?.name ?? alt}
          width={96}
          height={96}
          unoptimized
        />
      </span>
    );
  }

  return (
    <span className={className} aria-hidden="true" data-decoration="emoji">
      {value}
    </span>
  );
}
