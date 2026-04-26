'use client';

import React, { useState, useEffect } from 'react';

const Holidays = () => {
    const [holidays, setHolidays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // Modal/Form states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        type: 'Regular',
        multiplier: '2.0'
    });

    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/holidays');
            const data = await res.json();
            setHolidays(data);
        } catch (error) {
            console.error('Error fetching holidays:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingHoliday ? `/api/holidays/${editingHoliday.id}` : '/api/holidays';
        const method = editingHoliday ? 'PATCH' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditingHoliday(null);
                setFormData({ name: '', date: '', type: 'Regular', multiplier: '2.0' });
                fetchHolidays();
            }
        } catch (error) {
            console.error('Error saving holiday:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this holiday?')) return;
        try {
            const res = await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
            if (res.ok) fetchHolidays();
        } catch (error) {
            console.error('Error deleting holiday:', error);
        }
    };

    const openEditModal = (holiday: any) => {
        setEditingHoliday(holiday);
        setFormData({
            name: holiday.name,
            date: new Date(holiday.date).toISOString().split('T')[0],
            type: holiday.type,
            multiplier: holiday.multiplier.toString()
        });
        setIsModalOpen(true);
    };

    // Calendar Helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-32 border border-slate-50 bg-slate-50/30"></div>);
    }
    
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const holidayForDay = holidays.find(h => new Date(h.date).toISOString().split('T')[0] === dateStr);
        
        days.push(
            <div 
                key={d} 
                className={`h-32 border border-slate-50 p-3 transition-all hover:bg-white relative group cursor-pointer ${
                    holidayForDay ? 'bg-indigo-50/30' : 'bg-white'
                }`}
                onClick={() => {
                    if (holidayForDay) {
                        openEditModal(holidayForDay);
                    } else {
                        setEditingHoliday(null);
                        setFormData({ ...formData, date: dateStr });
                        setIsModalOpen(true);
                    }
                }}
            >
                <span className={`text-sm font-black ${holidayForDay ? 'text-indigo-600' : 'text-slate-400'}`}>{d}</span>
                {holidayForDay && (
                    <div className="mt-2 flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-indigo-700 leading-tight truncate px-2 py-1 bg-white border border-indigo-100 rounded-lg shadow-sm">
                            {holidayForDay.name}
                        </span>
                        <div className="flex gap-1">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${
                                holidayForDay.type === 'Regular' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                            }`}>
                                {holidayForDay.type.split(' ')[0]}
                            </span>
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-slate-900 text-white uppercase tracking-tighter">
                                {Math.round(holidayForDay.multiplier * 100)}%
                            </span>
                        </div>
                    </div>
                )}
                <div className="absolute inset-0 border-2 border-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none z-10 scale-[0.98]"></div>
            </div>
        );
    }

    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">Holiday Config</h1>
                    <p className="text-slate-500 font-medium italic">Configure holiday multipliers and classifications for payroll processing.</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => { setEditingHoliday(null); setFormData({ name: '', date: '', type: 'Regular', multiplier: '2.0' }); setIsModalOpen(true); }}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        Add Holiday
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Calendar Side */}
                <div className="xl:col-span-3 space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                        {/* Calendar Header */}
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-6">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{monthNames[month]} <span className="text-indigo-600">{year}</span></h2>
                                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                                    <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button onClick={() => setCurrentDate(new Date())} className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600">Today</button>
                                    <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                {["Regular", "Special"].map(t => (
                                    <div key={t} className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${t === 'Regular' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                                <div key={d} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 border-b border-slate-50">{d}</div>
                            ))}
                            {days}
                        </div>
                    </div>
                </div>

                {/* Sidebar Side */}
                <div className="space-y-8">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                        <h3 className="text-xl font-black tracking-tight mb-2">Active Holidays</h3>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.15em] mb-6">Upcoming in {year}</p>
                        
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {holidays.filter(h => new Date(h.date).getFullYear() === year).length > 0 ? (
                                holidays.filter(h => new Date(h.date).getFullYear() === year).map((h: any) => (
                                    <div key={h.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">{new Date(h.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>
                                                <span className="text-lg font-black tracking-tight leading-tight">{h.name}</span>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditModal(h)} className="p-2 text-white/40 hover:text-white transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                <button onClick={() => handleDelete(h.id)} className="p-2 text-white/40 hover:text-rose-400 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                                                h.type === 'Regular' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                            }`}>
                                                {h.type}
                                            </span>
                                            <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/10 text-white border border-white/10">
                                                ×{h.multiplier}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                    <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">No holidays defined</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{editingHoliday ? 'Edit Holiday' : 'Create Holiday'}</h2>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Configure payroll premium settings</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-300 hover:text-slate-900 transition-all hover:bg-slate-100 rounded-xl">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Holiday Name</label>
                                <input 
                                    type="text" required placeholder="e.g., Independence Day"
                                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-slate-800 text-lg transition-all"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                    <input 
                                        type="date" required 
                                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-slate-700 transition-all"
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pay Multiplier</label>
                                    <div className="relative">
                                        <input 
                                            type="number" step="0.01" required
                                            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-indigo-600 text-xl transition-all"
                                            value={formData.multiplier}
                                            onChange={(e) => setFormData({...formData, multiplier: e.target.value})}
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">x</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Holiday Classification</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {["Regular", "Special Non-working"].map(type => (
                                        <button
                                            key={type} type="button"
                                            onClick={() => setFormData({...formData, type, multiplier: type === 'Regular' ? '2.0' : '1.3'})}
                                            className={`p-4 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest ${
                                                formData.type === type 
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 italic text-[10px] text-amber-700 font-bold leading-relaxed">
                                Tip: Regular Holidays typically pay 200% (Multiplier: 2.0). Special Non-working Days typically pay 130% (Multiplier: 1.3).
                            </div>
                            <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-2xl hover:bg-black transition-all active:scale-[0.98]">
                                {editingHoliday ? 'Update Configuration' : 'Save Holiday Configuration'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Holidays;
