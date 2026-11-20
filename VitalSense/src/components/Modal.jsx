import { useEffect, useRef } from 'react';

// Native modal dialogs keep focus inside and make the underlying page inert.
export default function Modal({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus?.(); };
  }, []);
  return <dialog ref={ref} className="modal-backdrop" onCancel={event => {event.preventDefault(); onClose();}}>{children}</dialog>;
}
