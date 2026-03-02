'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData.role === 'HR Manager') {
        router.push("/hr/dashboard");
      } else if (userData.role === 'Accounting Manager') {
        router.push("/accounting/dashboard");
      } else if (userData.role === 'Super Admin') {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard"); // Fallback
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-bold">Redirecting...</div>;
}
