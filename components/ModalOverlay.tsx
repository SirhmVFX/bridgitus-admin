"use client";

import ModalPortal from "@/components/ModalPortal";
import type { ReactNode, MouseEvent } from "react";

type Props = {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
};

/** Full-screen modal backdrop portaled to body (avoids page overflow/transform clipping). */
export default function ModalOverlay({ children, onClose, className = "" }: Props) {
  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose?.();
  }

  return (
    <ModalPortal>
      <div className={`modal-overlay ${className}`.trim()} onClick={handleClick}>
        {children}
      </div>
    </ModalPortal>
  );
}
