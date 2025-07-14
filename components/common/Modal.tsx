
import React from 'react';
import { XCircleIcon } from '../../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full ${sizeClasses[size]} transform transition-all`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-sky-700">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <XCircleIcon className="w-8 h-8" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
