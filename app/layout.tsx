import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import InstallPrompt from "@/components/ui/InstallPrompt";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "ALIETAKE - College Management System",
    description: "Comprehensive college management system for attendance, academics, and fee management",
    applicationName: "ALIET Attendance",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "ALIET Attendance",
    },
    formatDetection: {
        telephone: false,
    },
};

export const viewport: Viewport = {
    themeColor: "#2563eb",
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
                    {children}
                    <InstallPrompt />
                </AuthProvider>
            </body>
        </html>
    );
}
