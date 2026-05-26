import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { container: "h-9 w-9", text: "text-lg", radius: "rounded-xl" },
  md: { container: "h-16 w-16", text: "text-xl", radius: "rounded-2xl" },
  lg: { container: "h-[100px] w-[100px]", text: "text-3xl", radius: "rounded-[1.25rem]" },
  xl: { container: "h-[120px] w-[120px]", text: "text-5xl md:text-6xl", radius: "rounded-[1.5rem]" },
};

export default function Logo({ size = "md", showText = false, className = "" }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`${s.container} relative shrink-0`}
      >
        <Image
          src="/logo.png"
          alt="TumbaNet"
          fill
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <span className={`${s.text} font-extrabold gradient-text`}>
          TumbaNet
        </span>
      )}
    </div>
  );
}
