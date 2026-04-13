"use client";

import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

type ImageModalProps = {
  imageUrl: string;
  title: string;
  onClose: () => void;
};

export function ImageModal({ imageUrl, title, onClose }: ImageModalProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <button className="modal-close" onClick={onClose} aria-label="Fechar imagem">
        Fechar
      </button>
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={4}
        centerOnInit
        doubleClick={{ mode: "toggle" }}
      >
        <TransformComponent wrapperClass="modal-image-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={title} className="modal-image" />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
