/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { materialApi } from '../services/materialApi';
import { StudyMaterial } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMaterialUploaded?: (newMaterial: StudyMaterial) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onMaterialUploaded,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Physics');
  const [topic, setTopic] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMaterial, setSuccessMaterial] = useState<StudyMaterial | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const subjects = [
    'Physics',
    'Mathematics',
    'Chemistry',
    'Computer Science',
    'Electrical Engineering',
    'General Studies',
  ];

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['.pdf', '.txt', '.md'];
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();

    if (!validExtensions.includes(ext)) {
      setErrorMessage(`Unsupported file format '${ext}'. Please upload a PDF (.pdf), Plain Text (.txt), or Markdown (.md) document.`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 25 MB.`);
      return;
    }

    setSelectedFile(file);
    // Auto-suggest title from filename if title field is empty
    if (!title) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
      setTitle(baseName);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please choose a document file to upload.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim() || selectedFile.name);
      formData.append('subject', subject);
      formData.append('topic', topic.trim() || 'General');

      const response = await materialApi.uploadMaterial(formData, (percent) => {
        setUploadProgress(percent);
      });

      setSuccessMaterial(response.material);
      if (onMaterialUploaded) {
        onMaterialUploaded(response.material);
      }

      // Auto close modal after brief delay showing success state
      setTimeout(() => {
        handleResetAndClose();
      }, 1400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload study document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetAndClose = () => {
    setSelectedFile(null);
    setTitle('');
    setSubject('Physics');
    setTopic('');
    setErrorMessage(null);
    setSuccessMaterial(null);
    setUploadProgress(0);
    setIsUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-[var(--aven-border)]/50 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--aven-border)]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--aven-action)] flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[22px]">upload_file</span>
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[var(--aven-ink)]">Upload Study Material</h3>
              <p className="text-[12px] text-[var(--aven-muted)]">
                Store documents safely in your personal AVEN library
              </p>
            </div>
          </div>
          {!isUploading && (
            <button
              onClick={handleResetAndClose}
              className="text-[var(--aven-muted)] hover:text-[var(--aven-ink)] p-1.5 rounded-xl hover:bg-[var(--aven-soft)] transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-[13px] text-red-700">
            <span className="material-symbols-outlined text-[20px] text-red-600 shrink-0">error</span>
            <div className="flex-1 leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* Success Banner */}
        {successMaterial && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 animate-in fade-in">
            <span className="material-symbols-outlined text-[24px] text-emerald-600">check_circle</span>
            <div>
              <p className="text-[13px] font-bold">Upload & Verification Complete!</p>
              <p className="text-[12px] text-emerald-700">
                "{successMaterial.title}" is saved in your study library.
              </p>
            </div>
          </div>
        )}

        {/* Upload Form */}
        {!successMaterial && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {/* File Dropzone */}
            {!selectedFile ? (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-[var(--aven-action)] bg-[var(--aven-soft)]'
                    : 'border-[var(--aven-border)] hover:border-[var(--aven-action)] hover:bg-[var(--aven-soft)]/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.md"
                  onChange={handleNativeChange}
                  disabled={isUploading}
                />
                <div className="w-12 h-12 rounded-full bg-[var(--aven-soft)] text-[var(--aven-action)] flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[26px]">cloud_upload</span>
                </div>
                <p className="text-[14px] font-bold text-[var(--aven-ink)]">
                  Click to select or drag & drop file
                </p>
                <p className="text-[12px] text-[var(--aven-muted)] mt-0.5">
                  Supported: PDF (.pdf), Plain Text (.txt), Markdown (.md) • Your account’s upload limit applies
                </p>
              </label>
            ) : (
              <div className="p-4 rounded-2xl bg-[var(--aven-soft)]/60 border border-[var(--aven-action)]/30 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[var(--aven-action)] text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      {selectedFile.name.endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[var(--aven-ink)] truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-[var(--aven-muted)]">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                    </p>
                  </div>
                </div>

                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 rounded-lg text-[var(--aven-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove file"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>
            )}

            {/* Document Metadata Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-[var(--aven-muted)] mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Electromagnetic Waves Lecture 5"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-[var(--aven-border)] text-[13px] text-[var(--aven-ink)] placeholder-[var(--aven-muted)] focus:outline-none focus:border-[var(--aven-action)] focus:ring-1 focus:ring-[var(--aven-action)]"
                  disabled={isUploading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[var(--aven-muted)] mb-1">
                    Subject
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-[var(--aven-border)] text-[13px] text-[var(--aven-ink)] focus:outline-none focus:border-[var(--aven-action)] focus:ring-1 focus:ring-[var(--aven-action)]"
                    disabled={isUploading}
                  >
                    {subjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[var(--aven-muted)] mb-1">
                    Topic / Unit (Optional)
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Wave Optics, Unit 3"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-[var(--aven-border)] text-[13px] text-[var(--aven-ink)] placeholder-[var(--aven-muted)] focus:outline-none focus:border-[var(--aven-action)] focus:ring-1 focus:ring-[var(--aven-action)]"
                    disabled={isUploading}
                  />
                </div>
              </div>
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-[var(--aven-action)] flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-[var(--aven-action)] border-t-transparent rounded-full animate-spin"></span>
                    Uploading & verifying file...
                  </span>
                  <span className="text-[var(--aven-muted)] font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[var(--aven-soft)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--aven-action)] transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Processing guidance */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11.5px] text-[var(--aven-muted)] flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-[var(--aven-action)] shrink-0 mt-0.5">info</span>
              <div>
                After upload, Aven extracts the text and prepares your document for search. You can follow its progress in your library.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl border border-[var(--aven-border)] text-[var(--aven-muted)] hover:text-[var(--aven-ink)] hover:bg-[var(--aven-soft)]/50 text-[13px] font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="inline-flex items-center gap-2 bg-[var(--aven-action)] hover:bg-[var(--aven-action-hover)] text-white px-5 py-2 rounded-xl text-[13px] font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                    <span>Upload Document</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
