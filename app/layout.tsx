import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import InstallPrompt from "@/components/ui/InstallPrompt";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeToggleFloating from "@/components/ui/ThemeToggleFloating";
import NavigationDock from "@/components/ui/NavigationDock";
import LoadingBar from "@/components/ui/LoadingBar";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "ALIETAKE - College Management System",
    description: "Comprehensive college management system for attendance, academics, and fee management",
    applicationName: "ALIETAKE",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "ALIETAKE",
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        icon: '/logo.png',
        apple: '/logo.png',
    },
};

export const viewport: Viewport = {
    themeColor: "#1E88E5",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuthProvider>
                    <ThemeProvider>
                        <ServiceWorkerRegister />
                        <Suspense fallback={null}>
                            <LoadingBar />
                        </Suspense>
                        {children}
                        <InstallPrompt />
                        <ThemeToggleFloating />
                        <NavigationDock />
                    </ThemeProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
