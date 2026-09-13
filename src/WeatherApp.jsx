import { useEffect, useState } from "react";
import WeatherDashboard from "./WeatherDashboard.jsx";
import WeatherHistory from "./WeatherHistory.jsx";
import { checkEmailAccess, getSession, onAuthChange, signInWithGoogle, signOut } from "./supabaseAuth.js";

const SUPER_ADMIN = "dangnhan.mrt@gmail.com";

const styles = {
  app: { minHeight: "100vh", background: "#07111f", color: "#dbeafe", fontFamily: "Lexend, sans-serif" },
  header: { minHeight: 74, padding: "0 28px", borderBottom: "1px solid rgba(148,163,184,.12)", background: "#091525", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 22, position: "sticky", top: 0, zIndex: 20 },
  logo: { display: "flex", flexDirection: "column", gap: 2, minWidth: 220 },
  nav: { display: "flex", alignItems: "center", gap: 6 },
  tab: (active) => ({ border: active ? "1px solid rgba(56,189,248,.38)" : "1px solid transparent", background: active ? "rgba(14,165,233,.12)" : "transparent", color: active ? "#7dd3fc" : "#71849a", padding: "10px 15px", borderRadius: 9, cursor: "pointer", font: "500 12px Lexend, sans-serif" }),
  content: { maxWidth: 1750, margin: "0 auto", padding: "30px 34px 24px" },
  ghost: { border: "1px solid rgba(148,163,184,.16)", background: "rgba(255,255,255,.035)", color: "#94a3b8", borderRadius: 8, padding: "8px 12px", cursor: "pointer", font: "400 11px Lexend, sans-serif" },
};

function FullScreenMessage({ children }) {
  return <div style={{ minHeight: "100vh", background: "#07111f", display: "grid", placeItems: "center", color: "#7890a8", fontFamily: "Lexend, sans-serif" }}><link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet" />{children}</div>;
}

function Login({ error }) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handleLogin() {
    setBusy(true);
    setLocalError("");
    const { error: loginError } = await signInWithGoogle(`${window.location.origin}/weather/`);
    if (loginError) {
      setLocalError(loginError.message || "Không thể đăng nhập.");
      setBusy(false);
    }
  }

  return (
    <FullScreenMessage>
      <div style={{ width: "min(420px, calc(100vw - 40px))", padding: 32, border: "1px solid rgba(125,211,252,.16)", background: "#0c1828", borderRadius: 18, boxShadow: "0 20px 70px rgba(0,0,0,.28)", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🌦️</div>
        <h1 style={{ margin: "0 0 7px", color: "#f8fafc", fontSize: 24 }}>SanThai Weather</h1>
        <p style={{ margin: "0 0 24px", fontSize: 12, lineHeight: 1.6, color: "#64748b" }}>Dự báo vận hành và lịch sử mưa của hệ thống cửa hàng</p>
        {(localError || error) && <div style={{ color: "#fda4af", fontSize: 11, marginBottom: 14 }}>{localError || error}</div>}
        <button onClick={handleLogin} disabled={busy} style={{ width: "100%", padding: "11px 16px", borderRadius: 9, border: "1px solid rgba(56,189,248,.32)", background: "rgba(14,165,233,.14)", color: "#7dd3fc", cursor: busy ? "default" : "pointer", font: "600 13px Lexend, sans-serif", opacity: busy ? .6 : 1 }}>{busy ? "Đang chuyển hướng…" : "Đăng nhập bằng Google"}</button>
      </div>
    </FullScreenMessage>
  );
}

export default function WeatherApp() {
  const [user, setUser] = useState(undefined);
  const [role, setRole] = useState(null);
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState("forecast");

  useEffect(() => {
    let mounted = true;
    async function checkAuth() {
      try {
        const session = await getSession();
        if (!mounted) return;
        const currentUser = session?.user || null;
        if (!currentUser) {
          setUser(null);
          setRole(null);
          return;
        }
        const email = currentUser.email?.toLowerCase().trim();
        const currentRole = email === SUPER_ADMIN ? "admin" : await checkEmailAccess(email);
        if (!mounted) return;
        setUser(currentUser);
        setRole(currentRole);
        setAuthError(currentRole ? "" : `Email ${currentUser.email} chưa được cấp quyền.`);
      } catch (error) {
        if (!mounted) return;
        setUser(null);
        setRole(null);
        setAuthError(`Không thể kiểm tra đăng nhập: ${error?.message || "unknown"}`);
      }
    }
    checkAuth();
    const { data: { subscription } } = onAuthChange((event) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setUser(null);
        setRole(null);
      } else if (event === "SIGNED_IN") {
        checkAuth();
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  if (user === undefined) return <FullScreenMessage><div>Đang kiểm tra phiên đăng nhập…</div></FullScreenMessage>;
  if (!user) return <Login error={authError} />;
  if (!role) return <FullScreenMessage><div style={{ textAlign: "center" }}><div style={{ color: "#fda4af", marginBottom: 14 }}>{authError || "Tài khoản chưa được cấp quyền."}</div><button style={styles.ghost} onClick={signOut}>Đăng xuất</button></div></FullScreenMessage>;

  return (
    <div style={styles.app}>
      <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box}body{margin:0;background:#07111f}@media(max-width:760px){.weather-app-header{padding:12px 16px!important;align-items:flex-start!important;flex-wrap:wrap}.weather-app-logo{min-width:0!important}.weather-app-nav{order:3;width:100%}.weather-app-nav button{flex:1}.weather-app-account span{display:none}.weather-app-content{padding:22px 14px!important}}`}</style>
      <header className="weather-app-header" style={styles.header}>
        <div className="weather-app-logo" style={styles.logo}>
          <strong style={{ color: "#7dd3fc", fontSize: 18 }}>🌦️ SanThai Weather</strong>
          <span style={{ color: "#526275", fontSize: 9, textTransform: "uppercase", letterSpacing: ".1em" }}>Hệ thống thời tiết cửa hàng</span>
        </div>
        <nav className="weather-app-nav" style={styles.nav}>
          <button style={styles.tab(tab === "forecast")} onClick={() => setTab("forecast")}>⛅ Dự báo</button>
          <button style={styles.tab(tab === "history")} onClick={() => setTab("history")}>🌧️ Lịch sử mưa</button>
        </nav>
        <div className="weather-app-account" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#64748b", fontSize: 11 }}>{user.email}</span>
          <button style={styles.ghost} onClick={signOut}>Đăng xuất</button>
        </div>
      </header>
      <main className="weather-app-content" style={styles.content}>
        {tab === "forecast" && <WeatherDashboard />}
        {tab === "history" && <WeatherHistory />}
        <footer style={{ textAlign: "center", borderTop: "1px solid rgba(148,163,184,.07)", color: "#35475a", fontSize: 10, marginTop: 38, paddingTop: 16 }}>© 2026 SanThai Weather · Dữ liệu theo ô lưới khí tượng</footer>
      </main>
    </div>
  );
}
