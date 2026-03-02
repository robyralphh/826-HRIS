'use client';

import LoginPage from "@/component/LoginPage";
import { useRouter } from "next/navigation";

export default function LoginRoute() {
    const router = useRouter();

    const handleLoginSuccess = () => {
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
            router.push("/login");
        }
    };

    return <LoginPage onLogin={handleLoginSuccess} />;
}
