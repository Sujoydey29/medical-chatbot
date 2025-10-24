import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManusDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  // onLogin is optional; if not provided the dialog will navigate to the login URL
  onLogin?: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function ManusDialog({
  title = APP_TITLE,
  logo = APP_LOGO,
  open = false,
  onLogin,
  onOpenChange,
  onClose,
}: ManusDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);

  useEffect(() => {
    if (!onOpenChange) {
      setInternalOpen(open);
    }
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }

    if (!nextOpen) {
      onClose?.();
    }
  };

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
      return;
    }
    // Default behavior: open the dialog's built-in login form
    setMode("login");
    setFormOpen(true);
  };

  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const url = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "register" ? { email, password, name: email.split("@")[0] } : { email, password, redirect: window.location.href };
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed: ${res.status}`);
      }

      // on success, the server sets cookie and may redirect; reload to pick up session
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={onOpenChange ? open : internalOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="py-5 bg-[#f8f8f7] rounded-[20px] w-[400px] shadow-[0px_4px_11px_0px_rgba(0,0,0,0.08)] border border-[rgba(0,0,0,0.08)] backdrop-blur-2xl p-0 gap-0 text-center">
        <div className="flex flex-col items-center gap-2 p-5 pt-12">
          <div className="w-16 h-16 bg-white rounded-xl border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
            <img src={logo} alt="App icon" className="w-10 h-10 rounded-md" />
          </div>

          {/* Title and subtitle */}
          <DialogTitle className="text-xl font-semibold text-[#34322d] leading-[26px] tracking-[-0.44px]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#858481] leading-5 tracking-[-0.154px]">
            Please sign in to continue
          </DialogDescription>
        </div>

        <DialogFooter className="px-5 py-5">
          {!formOpen ? (
            <>
              <Button
                onClick={handleLogin}
                className="w-full h-10 bg-[#1a1a19] hover:bg-[#1a1a19]/90 text-white rounded-[10px] text-sm font-medium leading-5 tracking-[-0.154px]"
              >
                Sign In
              </Button>
              <div className="text-xs text-muted-foreground mt-2">
                Or <button className="underline" onClick={() => { setMode("register"); setFormOpen(true); }}>Create an account</button>
              </div>
            </>
          ) : (
            <div className="w-full">
              <div className="flex flex-col gap-2 mb-3">
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border rounded" />
                <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-2 border rounded" />
              </div>
              {error && <div className="text-sm text-destructive mb-2">{error}</div>}
              <div className="flex gap-2">
                <Button onClick={submit} disabled={loading} className="flex-1">
                  {mode === "register" ? "Create Account" : "Sign In"}
                </Button>
                <Button variant="ghost" onClick={() => { setFormOpen(false); setError(null); }}>
                  Cancel
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {mode === "login" ? (
                  <>Don't have an account? <button className="underline" onClick={() => setMode("register")}>Register</button></>
                ) : (
                  <>Already have an account? <button className="underline" onClick={() => setMode("login")}>Sign in</button></>
                )}
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
