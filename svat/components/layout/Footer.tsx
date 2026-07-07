interface FooterProps {
  variant?: "default" | "compact";
}

export default function Footer({ variant = "default" }: FooterProps) {
  const links = (
    <>
      <a
        className="font-label-sm text-label-sm text-outline transition-colors hover:text-primary dark:text-outline-variant dark:hover:text-on-primary"
        href="#"
      >
        Terms of Service
      </a>
      <a
        className="font-label-sm text-label-sm text-outline transition-colors hover:text-primary dark:text-outline-variant dark:hover:text-on-primary"
        href="#"
      >
        Privacy Policy
      </a>
      <a
        className="font-label-sm text-label-sm text-outline transition-colors hover:text-primary dark:text-outline-variant dark:hover:text-on-primary"
        href="#"
      >
        Risk Disclosure
      </a>
      <a
        className="font-label-sm text-label-sm text-outline transition-colors hover:text-primary dark:text-outline-variant dark:hover:text-on-primary"
        href="#"
      >
        Help Center
      </a>
    </>
  );

  if (variant === "compact") {
    return (
      <footer className="z-50 flex w-full flex-col items-center justify-between border-t border-outline-variant bg-surface-container-lowest px-xl py-md md:flex-row">
        <span className="mb-md font-label-md text-label-md font-bold text-primary md:mb-0">
          © 2024 One Traders Education.
        </span>
        <div className="flex flex-wrap justify-center gap-lg">{links}</div>
      </footer>
    );
  }

  return (
    <footer className="flex w-full flex-col items-center justify-between border-t border-outline-variant bg-surface-container-lowest px-xl py-lg md:flex-row">
      <div className="mb-md flex items-center gap-md md:mb-0">
        <span className="font-label-md text-label-md font-bold text-primary">
          One Traders
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          © 2024 One Traders Education. Professional Trading Terminals.
        </span>
      </div>
      <div className="flex gap-xl">{links}</div>
    </footer>
  );
}
