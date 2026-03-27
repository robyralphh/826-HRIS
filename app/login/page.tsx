'use client';

import LoginPage from "@/component/LoginPage";
import { useRouter } from "next/navigation";

export default function LoginRoute() {
    const router = useRouter();

    const handleLoginSuccess = () => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            router.push("/ess/dashboard");
        } else {
            router.push("/login");
        }
    };

    return <LoginPage onLogin={handleLoginSuccess} />;
}
