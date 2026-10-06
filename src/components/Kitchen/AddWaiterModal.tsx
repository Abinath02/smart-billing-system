import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Waiter } from '../../types/database.types';

interface AddWaiterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWaiterAdded: (waiter: Waiter) => void;
}

export const AddWaiterModal: React.FC<AddWaiterModalProps> = ({
  isOpen,
  onClose,
  onWaiterAdded,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter the waiter name.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const generatedCode = empCode.trim() || `W-${Math.floor(10 + Math.random() * 90)}`;
      const { data, error: insertError } = await supabase
        .from('waiters')
        .insert([
          {
            name: name.trim(),
            phone: phone.trim() || null,
            emp_code: generatedCode,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      onWaiterAdded(data as Waiter);
      setName('');
      setPhone('');
      setEmpCode('');
      onClose();
    } catch (err: any) {
      console.error('Error adding waiter:', err);
      setError(err.message || 'Could not add waiter.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-6 animate-scaleUp">
        <div className="flex items-center justify-between border-b pb-3 border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤵</span>
            <h3 className="text-base font-bold text-gray-900">Add New Waiter</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Waiter Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Karthik Nathan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Staff / Employee Code
            </label>
            <input
              type="text"
              placeholder="e.g. W-04 (Auto if empty)"
              value={empCode}
              onChange={(e) => setEmpCode(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95"
            >
              {loading ? 'Saving...' : 'Add Waiter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
