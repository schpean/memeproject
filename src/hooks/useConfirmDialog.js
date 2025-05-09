import { useState, useCallback } from 'react';

/**
 * Un hook personalizat pentru gestionarea dialogurilor de confirmare
 * @returns {Object} Funcții și stare pentru dialogul de confirmare
 */
const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: 'Confirmare',
    message: '',
    confirmText: 'Da',
    cancelText: 'Nu',
    confirmButtonClass: 'danger',
    icon: 'warning',
    onConfirm: () => {},
    onCancel: () => {}
  });

  // Închidem dialogul
  const closeDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Deschide dialogul cu configurația primită
  const confirmDialog = useCallback((config) => {
    return new Promise((resolve) => {
      // Funcția de confirmare care va închide dialogul și va returna true
      const handleConfirm = () => {
        closeDialog();
        resolve(true);
        if (config.onConfirm) {
          config.onConfirm();
        }
      };

      // Funcția de anulare care va închide dialogul și va returna false
      const handleCancel = () => {
        closeDialog();
        resolve(false);
        if (config.onCancel) {
          config.onCancel();
        }
      };

      // Configurare dialog
      setDialogConfig({
        ...dialogConfig,
        ...config,
        onConfirm: handleConfirm,
        onCancel: handleCancel
      });

      // Deschide dialogul
      setIsOpen(true);
    });
  }, [closeDialog, dialogConfig]);

  return {
    isOpen,
    dialogConfig,
    confirmDialog,
    closeDialog
  };
};

export default useConfirmDialog; 