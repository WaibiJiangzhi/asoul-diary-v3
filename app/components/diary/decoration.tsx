import Image from 'next/image';

export function isSticker(value: string) {
  return value.startsWith('/stickers/');
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
  if (isSticker(value)) {
    return (
      <span className={className} data-decoration="sticker">
        <Image src={value} alt={alt} width={96} height={96} unoptimized />
      </span>
    );
  }

  return (
    <span className={className} aria-hidden="true" data-decoration="emoji">
      {value}
    </span>
  );
}

