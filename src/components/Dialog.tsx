import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export function Dialog({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current;const previous=document.activeElement as HTMLElement|null;d?.showModal();return()=>{d?.close();previous?.focus();};},[]);
  return <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="dialog-inner"><div className="section-top"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="Закрыть окно" onClick={onClose}><X size={21}/></button></div>{children}</div></dialog>;
}
