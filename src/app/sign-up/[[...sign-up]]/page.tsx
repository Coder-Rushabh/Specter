import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6">
            <SignUp
                appearance={{
                    elements: {
                        rootBox: "mx-auto",
                        card: "bg-[#0f0f0f] border border-white/5 shadow-2xl",
                        headerTitle: "text-white",
                        headerSubtitle: "text-slate-400 font-medium",
                        socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10",
                        socialButtonsBlockButtonText: "text-white font-semibold",
                        dividerLine: "bg-white/5",
                        dividerText: "text-slate-500",
                        formFieldLabel: "text-slate-400 font-bold uppercase text-[10px] tracking-widest",
                        formButtonPrimary: "bg-white text-black hover:bg-slate-200 transition-all active:scale-95",
                        footerActionText: "text-slate-500",
                        footerActionLink: "text-white hover:text-indigo-400 transition-colors"
                    }
                }}
            />
        </div>
    );
}
