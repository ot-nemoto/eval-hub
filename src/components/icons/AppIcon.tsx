export function AppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="12" y1="2" x2="12" y2="3.5" strokeWidth="1" />
      <path d="M6.5 7.5 L12 3.5 L17.5 7.5 L18.5 9.5 L5.5 9.5 Z" strokeWidth="1.2" fill="none" />
      <path d="M4.5 14 L12 9.5 L19.5 14 L20.5 16 L3.5 16 Z" strokeWidth="1.2" fill="none" />
      <line x1="3.5" y1="16" x2="20.5" y2="16" strokeWidth="1" />
      <rect x="8.5" y="16" width="7" height="5.5" strokeWidth="1.2" fill="none" />
      <line x1="3.5" y1="21.5" x2="20.5" y2="21.5" strokeWidth="1.2" />
    </svg>
  );
}
