
import React from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { Order } from '../types';

interface ReviewConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  order: Order | null;
}

const ReviewConfirmModal: React.FC<ReviewConfirmModalProps> = ({ isOpen, onClose, onConfirm, order }) => {
  const { t } = useLocalization();

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-8 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{t('modal.confirm.title')}</h3>
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">
              {t('modal.confirm.body')}
            </p>
            <div className="mt-4 text-left bg-gray-50 p-4 rounded-lg border">
                <p className="font-semibold text-gray-800">Supplier: <span className="font-normal">{order.supplier.SupplierName}</span></p>
                <p className="font-semibold text-gray-800 mt-2">Items:</p>
                <ul className="list-disc list-inside text-sm text-gray-600">
                    {order.items.map((item, index) => (
                        <li key={index}>{item.product.ProductName}</li>
                    ))}
                </ul>
            </div>
          </div>
          <div className="items-center px-4 py-3 space-y-3">
            <button
              id="confirm-button"
              className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              onClick={onConfirm}
            >
              {t('modal.confirm.confirm')}
            </button>
            <button
              id="cancel-button"
              className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              onClick={onClose}
            >
              {t('modal.confirm.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewConfirmModal;
