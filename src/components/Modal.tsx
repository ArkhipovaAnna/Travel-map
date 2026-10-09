import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props {
  onClose: () => void;
  /** Доп. класс для оформления (например, «lightbox») */
  className?: string;
  /** Подпись для скринридеров */
  label: string;
  children: ReactNode;
}

// Обёртка над нативным <dialog>: браузер сам закрывает по Escape, удерживает фокус
// внутри окна и возвращает его на кнопку, с которой окно открыли.
export default function Modal({ onClose, className = '', label, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  // Закрываем по клику на фон, только если и нажатие, и отпускание были на фоне.
  // Иначе выделение текста в поле, закончившееся за пределами окна, закрывало бы форму.
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-label={label}
      onClose={onClose}
      onMouseDown={(e) => (pressedOnBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => {
        if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      {children}
    </dialog>
  );
}
