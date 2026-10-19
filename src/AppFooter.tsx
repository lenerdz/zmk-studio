// Modified by the lenerdz/zmk-studio fork: adds the "Unofficial fork" link.
export interface AppFooterProps {
  onShowAbout: () => void;
  onShowLicenseNotice: () => void;
}

export const AppFooter = ({
  onShowAbout,
  onShowLicenseNotice,
}: AppFooterProps) => {
  return (
    <div className="grid justify-center p-1 bg-base-200">
      <div>
        <span>&copy; 2026 - The ZMK Contributors</span> -{" "}
        <a className="hover:text-primary hover:cursor-pointer" onClick={onShowAbout}>
          About ZMK Studio
        </a>{" "}
        -{" "}
        <a className="hover:text-primary hover:cursor-pointer" onClick={onShowLicenseNotice}>
          License NOTICE
        </a>{" "}
        -{" "}
        <a
          className="hover:text-primary hover:cursor-pointer"
          href="https://github.com/lenerdz/zmk-studio"
          target="_blank"
          rel="noreferrer"
        >
          Unofficial fork
        </a>
      </div>
    </div>
  );
};
