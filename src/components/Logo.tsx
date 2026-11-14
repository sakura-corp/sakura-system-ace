interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}sakura-logo.svg`}
      alt="Sakura System — by Sakura Corp"
      className={`h-auto w-full max-w-56 drop-shadow-[0_0_12px_rgba(255,122,77,0.3)] ${className}`}
    />
  );
}
