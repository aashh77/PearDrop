// Small hand-rolled inline SVG icon set - avoids pulling in an extra icon
// dependency just for a handful of glyphs.

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconLaptop(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <rect x="3" y="4" width="18" height="11" rx="1.5" />
      <path d="M2 19h20l-1.5-3h-17z" />
    </svg>
  );
}

export function IconPhone(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function IconTablet(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function IconFile(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function IconCode(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="m8 6-6 6 6 6" />
      <path d="m16 6 6 6-6 6" />
    </svg>
  );
}

export function IconUpload(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="M12 16V4" />
      <path d="m6 10 6-6 6 6" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function IconDownload(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="M12 4v12" />
      <path d="m6 12 6 6 6-6" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...props}>
      <path d="m4 12 5 5 11-11" />
    </svg>
  );
}

export function IconX(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...props}>
      <path d="m5 5 14 14" />
      <path d="m19 5-14 14" />
    </svg>
  );
}

export function IconCopy(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...props}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

export function IconWifi(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="M5 13a10 10 0 0 1 14 0" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M12 20h.01" />
    </svg>
  );
}

export function IconLink(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function IconAlert(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

export function deviceIcon(type, props) {
  if (type === "phone") return <IconPhone {...props} />;
  if (type === "tablet") return <IconTablet {...props} />;
  return <IconLaptop {...props} />;
}
