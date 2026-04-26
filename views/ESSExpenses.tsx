'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ESSExpensesView() {
    const router = useRouter();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Viewer states
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewerImages, setViewerImages] = useState<string[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [viewerZoom, setViewerZoom] = useState(1);
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form states
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Travel');
    const [description, setDescription] = useState('');
    const [receiptLinks, setReceiptLinks] = useState<string[]>(['']);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        fetchExpenses();
    }, [router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...files]);
            
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const addLinkField = () => setReceiptLinks([...receiptLinks, '']);
    const updateLinkField = (index: number, val: string) => {
        const newLinks = [...receiptLinks];
        newLinks[index] = val;
        setReceiptLinks(newLinks);
    };
    const removeLinkField = (index: number) => setReceiptLinks(receiptLinks.filter((_, i) => i !== index));

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem('user');
            const adminId = userStr ? JSON.parse(userStr).id || JSON.parse(userStr)._id : '';
            const res = await fetch('/api/ess/expenses', { 
                headers: { 'x-admin-id': adminId } 
            });
            if (res.ok) {
                const data = await res.json();
                setExpenses(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch expenses', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const adminId = user.id || user._id;

            let uploadedUrls: string[] = [];
            if (selectedFiles.length > 0) {
                const formData = new FormData();
                selectedFiles.forEach(file => formData.append('files', file));
                
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    uploadedUrls = uploadData.urls || [];
                }
            }

            const allUrls = [...uploadedUrls, ...receiptLinks.filter(l => l.trim() !== '')];

            const res = await fetch('/api/ess/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
                body: JSON.stringify({ amount, category, description, receiptUrls: allUrls })
            });
            if (res.ok) {
                setIsModalOpen(false);
                setAmount(''); setCategory('Travel'); setDescription(''); setReceiptLinks(['']);
                setSelectedFiles([]); setPreviews([]);
                fetchExpenses();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to submit request');
            }
        } catch (error) { 
            console.error(error); 
            alert('An error occurred. Please try again.');
        } finally { 
            setIsSaving(false); 
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Paid': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'Rejected': return 'bg-pink-100 text-pink-700 border-pink-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200'; 
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/ess/dashboard')} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-gray-900">Expense Reimbursements</h1>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">ESS Module</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    New Reimbursement
                </button>
            </header>

            <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/30">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Your Claims</h2>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Total Requests: {expenses.length}
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-20 gap-4">
                                <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading records...</p>
                            </div>
                        ) : (
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50">Date Submitted</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50">Category</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 text-center">Receipt</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50">Description</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 text-right">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-50 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {expenses.map(exp => (
                                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="font-bold text-gray-900 text-sm">
                                                    {new Date(exp.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                {(exp.receiptUrls || []).length > 0 ? (
                                                    <button 
                                                        onClick={() => {
                                                            setViewerImages(exp.receiptUrls);
                                                            setViewerIndex(0);
                                                            setIsViewerOpen(true);
                                                        }}
                                                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2 mx-auto active:scale-95"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        View ({exp.receiptUrls.length})
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-black text-slate-300 uppercase italic">None</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="max-w-[250px] truncate text-sm text-gray-500 font-medium" title={exp.description}>
                                                    {exp.description}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter border ${getStatusStyle(exp.status)}`}>
                                                    {exp.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-lg tracking-tighter text-slate-900">
                                                ₱{exp.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {expenses.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-24 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                                    </div>
                                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic">No reimbursement history found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">New Claim</h2>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Submit an expense for reimbursement</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-300 hover:text-slate-900 transition-all rounded-full hover:bg-slate-100">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateExpense} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                    <select 
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 transition-all"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        required
                                    >
                                        <option value="Travel">Travel</option>
                                        <option value="Meals">Meals</option>
                                        <option value="Office Supplies">Office Supplies</option>
                                        <option value="Utilities">Utilities</option>
                                        <option value="Training">Training</option>
                                        <option value="Client Ent">Client Entertainment</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₱)</label>
                                    <input 
                                        type="number" required placeholder="0.00" step="0.01"
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-slate-900 text-lg transition-all"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                <textarea 
                                    required rows={4} placeholder="What was this expense for?"
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-medium text-slate-600 text-sm transition-all resize-none"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="space-y-4 pt-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipts & Attachments</label>
                                
                                {/* Image Uploads */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-4">
                                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            Upload Images
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                                        </label>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{selectedFiles.length} files selected</span>
                                    </div>
                                    
                                    {previews.length > 0 && (
                                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                                            {previews.map((src, i) => (
                                                <div key={i} className="relative group w-16 h-16">
                                                    <img src={src} className="w-full h-full object-cover rounded-lg shadow-sm" alt="Preview" />
                                                    <button 
                                                        type="button" onClick={() => removeFile(i)}
                                                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* External Links */}
                                <div className="space-y-3">
                                    {receiptLinks.map((link, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="url" placeholder="Paste link to receipt (e.g. Google Drive, Dropbox)"
                                                    className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-600 text-[10px] transition-all"
                                                    value={link}
                                                    onChange={(e) => updateLinkField(idx, e.target.value)}
                                                />
                                            </div>
                                            {receiptLinks.length > 1 && (
                                                <button type="button" onClick={() => removeLinkField(idx)} className="p-3 text-rose-300 hover:text-rose-500 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button 
                                        type="button" onClick={addLinkField}
                                        className="text-indigo-600 hover:text-indigo-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ml-1 transition-colors"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                                        Add Another Link
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="w-full py-5 bg-indigo-600 text-white rounded-2.5xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isSaving && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                {isSaving ? 'Submitting...' : 'Submit Claim'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Receipt Viewer Modal */}
            {isViewerOpen && (
                <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex flex-col animate-in fade-in duration-300">
                    {/* Header */}
                    <div className="p-6 flex justify-between items-center bg-white/5 border-b border-white/10">
                        <div className="flex flex-col">
                            <h3 className="text-white font-black text-lg tracking-tight">Attachment Viewer</h3>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-0.5">
                                {viewerIndex + 1} of {viewerImages.length} • {viewerImages[viewerIndex].split('/').pop()?.split('-').pop()}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <a 
                                href={viewerImages[viewerIndex]} 
                                target="_blank" 
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                Open Original
                            </a>
                            <button 
                                onClick={() => setIsViewerOpen(false)}
                                className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all shadow-xl shadow-rose-500/20 active:scale-95"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 relative flex items-center justify-center p-12 group">
                        {/* Navigation - Prev */}
                        {viewerImages.length > 1 && (
                            <button 
                                onClick={() => {
                                    setViewerIndex((prev) => (prev === 0 ? viewerImages.length - 1 : prev - 1));
                                    setViewerZoom(1); // Reset zoom on slide change
                                }}
                                className="absolute left-8 p-6 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all z-10 group-hover:scale-110 active:scale-90"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                        )}

                        <div className="max-w-[95vw] max-h-[88vh] w-full h-full relative overflow-auto rounded-[2.5rem] shadow-2xl border border-white/10 bg-black/40 cursor-zoom-in group/viewer">
                            {/* Centering Wrapper */}
                            <div className="min-w-full min-h-full flex items-center justify-center p-8">
                                {viewerImages[viewerIndex].match(/\.(jpg|jpeg|png|gif|webp)$/i) || viewerImages[viewerIndex].startsWith('/uploads/') ? (
                                    <img 
                                        src={viewerImages[viewerIndex]} 
                                        alt="Receipt" 
                                        className="max-w-full max-h-full object-contain transition-transform duration-300 ease-out animate-in zoom-in duration-500"
                                        style={{ transform: `scale(${viewerZoom})`, transformOrigin: 'center' }}
                                    />
                                ) : (
                                    <div className="p-20 text-center">
                                        <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-white/20 mx-auto mb-6">
                                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </div>
                                        <h4 className="text-xl font-black text-white/80 tracking-tight">External Link Detected</h4>
                                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2 mb-8">This attachment is hosted externally (e.g. Google Drive/Dropbox)</p>
                                        <a 
                                            href={viewerImages[viewerIndex]} 
                                            target="_blank" 
                                            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mx-auto"
                                        >
                                            Visit External Site
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Zoom Controls */}
                            {viewerImages[viewerIndex].match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 opacity-0 group-hover/viewer:opacity-100 transition-all duration-300 z-50">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setViewerZoom(prev => Math.max(0.5, prev - 0.25)); }}
                                        className="p-2.5 text-white hover:bg-white/10 rounded-xl transition-colors"
                                        title="Zoom Out"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
                                    </button>
                                    <div className="px-4 text-[10px] font-black text-white uppercase tracking-widest border-x border-white/10 min-w-[80px] text-center">
                                        {Math.round(viewerZoom * 100)}%
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setViewerZoom(prev => Math.min(3, prev + 0.25)); }}
                                        className="p-2.5 text-white hover:bg-white/10 rounded-xl transition-colors"
                                        title="Zoom In"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setViewerZoom(1); }}
                                        className="p-2.5 text-white/40 hover:text-white transition-colors ml-1"
                                        title="Reset Zoom"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Navigation - Next */}
                        {viewerImages.length > 1 && (
                            <button 
                                onClick={() => {
                                    setViewerIndex((prev) => (prev === viewerImages.length - 1 ? 0 : prev + 1));
                                    setViewerZoom(1); // Reset zoom on slide change
                                }}
                                className="absolute right-8 p-6 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all z-10 group-hover:scale-110 active:scale-90"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Footer / Thumbnails */}
                    {viewerImages.length > 1 && (
                        <div className="p-8 flex justify-center gap-4 bg-white/5 border-t border-white/10 overflow-x-auto">
                            {viewerImages.map((src, i) => (
                                <button 
                                    key={src + i}
                                    onClick={() => setViewerIndex(i)}
                                    className={`relative w-24 h-16 rounded-xl overflow-hidden transition-all flex-shrink-0 ${
                                        i === viewerIndex ? 'ring-4 ring-indigo-500 scale-110' : 'opacity-40 hover:opacity-100'
                                    }`}
                                >
                                    {src.match(/\.(jpg|jpeg|png|gif|webp)$/i) || src.startsWith('/uploads/') ? (
                                        <img src={src} className="w-full h-full object-cover" alt="Thumbnail" />
                                    ) : (
                                        <div className="w-full h-full bg-indigo-900 flex items-center justify-center text-white/30">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
