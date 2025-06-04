import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Send, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Modal from '../ui/Modal';
import { useToast } from '../ui/Toast';
import DatePicker from '../ui/DatePicker';
import { format } from 'date-fns';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  number: string;
  patientId: string;
  patientName: string;
  date: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
}

interface InvoiceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice;
  onSave: (invoice: Omit<Invoice, 'id'>) => void;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  isOpen,
  onClose,
  invoice,
  onSave,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [formData, setFormData] = useState<Partial<Invoice>>({
    number: invoice?.number || `INV-${Date.now()}`,
    patientId: invoice?.patientId || '',
    patientName: invoice?.patientName || '',
    date: invoice?.date || new Date(),
    dueDate: invoice?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    items: invoice?.items || [],
    notes: invoice?.notes || '',
    status: invoice?.status || 'draft',
  });

  const [newItem, setNewItem] = useState<Partial<InvoiceItem>>({
    description: '',
    quantity: 1,
    unitPrice: 0,
  });

  const calculateTotals = () => {
    const subtotal = formData.items?.reduce((sum, item) => sum + item.total, 0) || 0;
    const tax = subtotal * 0.2; // 20% tax rate
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const addItem = () => {
    if (!newItem.description || !newItem.quantity || !newItem.unitPrice) {
      addToast({
        type: 'error',
        title: 'Invalid Item',
        message: 'Please fill in all item fields.',
      });
      return;
    }

    const item: InvoiceItem = {
      id: Date.now().toString(),
      description: newItem.description,
      quantity: newItem.quantity || 1,
      unitPrice: newItem.unitPrice || 0,
      total: (newItem.quantity || 1) * (newItem.unitPrice || 0),
    };

    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), item],
    }));

    setNewItem({
      description: '',
      quantity: 1,
      unitPrice: 0,
    });
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter(item => item.id !== itemId) || [],
    }));
  };

  const handleSave = () => {
    const { subtotal, tax, total } = calculateTotals();
    
    if (!formData.patientName || !formData.items?.length) {
      addToast({
        type: 'error',
        title: 'Invalid Invoice',
        message: 'Please select a patient and add at least one item.',
      });
      return;
    }

    onSave({
      ...formData,
      subtotal,
      tax,
      total,
    } as Omit<Invoice, 'id'>);

    addToast({
      type: 'success',
      title: 'Invoice Saved',
      message: 'Invoice has been saved successfully.',
    });

    onClose();
  };

  const handleSendInvoice = () => {
    handleSave();
    addToast({
      type: 'success',
      title: 'Invoice Sent',
      message: 'Invoice has been sent to the patient.',
    });
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={invoice ? 'Edit Invoice' : 'Create Invoice'}
      size="xl"
    >
      <div className="space-y-6">
        {/* Invoice Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Patient
            </label>
            <select
              value={formData.patientId}
              onChange={(e) => {
                const selectedPatient = e.target.selectedOptions[0];
                setFormData(prev => ({
                  ...prev,
                  patientId: e.target.value,
                  patientName: selectedPatient.text,
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select a patient</option>
              <option value="1">Mohammed Karimi</option>
              <option value="2">Fatima Benali</option>
              <option value="3">Omar Saidi</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Invoice Date
            </label>
            <DatePicker
              value={formData.date}
              onChange={(date) => setFormData(prev => ({ ...prev, date }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Due Date
            </label>
            <DatePicker
              value={formData.dueDate}
              onChange={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
            />
          </div>
        </div>

        {/* Invoice Items */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Invoice Items</h3>
          
          {/* Add Item Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <input
                type="text"
                placeholder="Description"
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Quantity"
                value={newItem.quantity}
                onChange={(e) => setNewItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Unit Price (MAD)"
                value={newItem.unitPrice}
                onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <Button onClick={addItem} size="sm">
              <Plus size={16} className="mr-2" />
              Add Item
            </Button>
          </div>

          {/* Items List */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {formData.items?.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.unitPrice.toFixed(2)} MAD
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.total.toFixed(2)} MAD
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {subtotal.toFixed(2)} MAD
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Tax (20%):</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {tax.toFixed(2)} MAD
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
              <span className="text-base font-medium text-gray-900 dark:text-white">Total:</span>
              <span className="text-base font-bold text-gray-900 dark:text-white">
                {total.toFixed(2)} MAD
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Additional notes or payment terms..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSave}>
            <FileText size={16} className="mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleSendInvoice}>
            <Send size={16} className="mr-2" />
            Save & Send
          </Button>
        </div>
      </div>
    </Modal>
  );
};
