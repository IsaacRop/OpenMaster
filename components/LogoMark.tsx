export default function LogoMark({ size = 42 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="32" cy="32" r="21" stroke="var(--color-rule-strong)" strokeWidth="1.2" strokeDasharray="3 5" />
      <line x1="32" y1="32" x2="53" y2="32" stroke="var(--color-seal)" strokeWidth="2" />
      <line x1="32" y1="32" x2="32" y2="11" stroke="var(--color-seal)" strokeWidth="2" />
      <line x1="32" y1="32" x2="17.2" y2="46.8" stroke="var(--color-seal)" strokeWidth="2" />
      <line x1="32" y1="32" x2="11" y2="32" stroke="#39414c" strokeWidth="1.5" />
      <line x1="32" y1="32" x2="46.8" y2="46.8" stroke="#39414c" strokeWidth="1.5" />
      <circle cx="53" cy="32" r="4" fill="var(--color-seal)" />
      <circle cx="32" cy="11" r="4" fill="var(--color-seal)" />
      <circle cx="17.2" cy="46.8" r="4" fill="var(--color-seal)" />
      <circle cx="11" cy="32" r="3" fill="#4a535f" />
      <circle cx="46.8" cy="46.8" r="3" fill="#4a535f" />
      <circle cx="32" cy="32" r="7" fill="var(--color-paper)" stroke="#fff" strokeWidth="2.4" />
    </svg>
  );
}
