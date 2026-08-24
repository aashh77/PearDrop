"use client";

import { deviceIcon } from "@/components/Icons";
import { avatarGradient, cx, initialsFromName } from "@/lib/format";

const SIZE_MAP = {
  sm: { box: "h-9 w-9", text: "text-xs", badge: "h-4 w-4 -bottom-0.5 -right-0.5", badgeIcon: 10 },
  md: { box: "h-11 w-11", text: "text-sm", badge: "h-5 w-5 -bottom-1 -right-1", badgeIcon: 11 },
  lg: { box: "h-14 w-14", text: "text-base", badge: "h-6 w-6 -bottom-1 -right-1", badgeIcon: 13 },
};

/**
 * A colorful initials avatar, deterministically generated from the device
 * name and always drawn from the app's green -> violet gradient palette so
 * every peer feels part of the same visual system. A small badge in the
 * corner keeps the (still useful) device-type glyph.
 */
export default function Avatar({ name, deviceType, size = "md", className, ringed = false }) {
  const [from, to] = avatarGradient(name);
  const dims = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div className={cx("relative shrink-0", dims.box, className)}>
      <div
        className={cx(
          "flex h-full w-full items-center justify-center rounded-full font-semibold text-white shadow-inner",
          dims.text,
          ringed && "ring-2 ring-black",
        )}
        style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
        aria-hidden="true"
      >
        {initialsFromName(name)}
      </div>
      {deviceType && (
        <div
          className={cx(
            "absolute flex items-center justify-center rounded-full border-2 border-neutral-950 bg-neutral-800 text-neutral-300",
            dims.badge,
          )}
          aria-hidden="true"
        >
          {deviceIcon(deviceType, { width: dims.badgeIcon, height: dims.badgeIcon, strokeWidth: 2 })}
        </div>
      )}
    </div>
  );
}
