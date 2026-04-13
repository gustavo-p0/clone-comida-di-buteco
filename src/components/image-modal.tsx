"use client";

import { useEffect } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

type ImageModalProps = {
  imageUrl: string;
  title: string;
  onClose: () => void;
};

export function ImageModal({ imageUrl, title, onClose }: ImageModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fechar imagem">
          Fechar
        </button>
        <TransformWrapper
          initialScale={1}
          minScale={1}
          maxScale={4}
          centerOnInit
          centerZoomedOut
          doubleClick={{ mode: "toggle" }}
        >
          <TransformComponent wrapperClass="modal-image-wrap" contentClass="modal-image-content">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={title} className="modal-image" />
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
}
