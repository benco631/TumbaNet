import Image from "next/image";

interface TumbaCoinIconProps {
  size?: number;
  className?: string;
}

export default function TumbaCoinIcon({ size = 34, className = "" }: TumbaCoinIconProps) {
  return (
    <Image
      src="/tumbacoin.png"
      alt="TumbaCoin"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      draggable={false}
    />
  );
}
