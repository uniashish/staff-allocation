import React, { useState, useEffect } from "react";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

const DeleteSchoolModal = ({
  isOpen,
  onClose,
  onConfirm,
  schoolName,
  isDeleting,
}) => {
  const [confirmText, setConfirmText] = useState("");
  const targetText = "deleteSchool";

  // Reset input when modal opens
  useEffect(() => {
    if (isOpen) setConfirmText("");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-red-100">
        {/* Warning Icon & Text */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
            <AlertTriangle className="text-red-600" size={28} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Delete School?</h3>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            You are about to permanently delete{" "}
            <span className="font-bold text-gray-900">{schoolName}</span>. All
            data including teachers, subjects, and classes will be wiped.
          </p>
        </div>

        <div className="space-y-5">
          {/* Confirmation Input */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 tracking-wide">
              Type{" "}
              <span className="text-red-600 font-mono">"{targetText}"</span> to
              confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-mono text-sm"
              placeholder={targetText}
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={confirmText !== targetText || isDeleting}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {isDeleting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Trash2 size={18} />
              )}
              Delete Forever
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteSchoolModal;
