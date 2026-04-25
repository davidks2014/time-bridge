"use client";

type LogoSize = "xs" | "sm" | "md" | "lg";
type LogoVariant = "light" | "dark" | "gold";

type Props = {
  size?: LogoSize;
  variant?: LogoVariant;
  showWordmark?: boolean;
  animated?: boolean;
  className?: string;
};

const SCALES: Record<LogoSize, number> = { xs: 0.35, sm: 0.5, md: 0.75, lg: 1 };

const COLORS: Record<LogoVariant, {
  env1Body: string; env1Stroke: string;
  env2Body: string; envFlap: string;
  heart: string; heartGlow: string;
  gold: string; wordmark: string; tagline: string; sep: string;
}> = {
  light: {
    env1Body: "#F5E8D0", env1Stroke: "#8B6914",
    env2Body: "#EDD8B8", envFlap: "#EDD8B8",
    heart: "#8B6914", heartGlow: "rgba(139,105,20,0.12)",
    gold: "#C4A060", wordmark: "#2C2416", tagline: "#9B8060", sep: "#C4A060",
  },
  dark: {
    env1Body: "#3A2A10", env1Stroke: "#C4A060",
    env2Body: "#2A1E0A", envFlap: "#2A1E0A",
    heart: "#C4A060", heartGlow: "rgba(196,160,96,0.15)",
    gold: "#E8C870", wordmark: "#F0E8D8", tagline: "#B89060", sep: "#C4A060",
  },
  gold: {
    env1Body: "#F5E8D0", env1Stroke: "#FAF7F2",
    env2Body: "#EDD8B8", envFlap: "#EDD8B8",
    heart: "#FAF7F2", heartGlow: "rgba(250,247,242,0.2)",
    gold: "#FAF7F2", wordmark: "#FAF7F2", tagline: "#F0E0C0", sep: "#FAF7F2",
  },
};

export default function TimeBridgeLogo({
  size = "md",
  variant = "light",
  showWordmark = true,
  animated = true,
  className = "",
}: Props) {
  const s = SCALES[size];
  const c = COLORS[variant];
  const w = Math.round(200 * s);
  const h = Math.round(210 * s);

  const animStyle = (name: string, duration = "5s", delay = "0s") =>
    animated ? { animation: `${name} ${duration} ease-in-out ${delay} infinite` } : {};

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: Math.round(20 * s) }}>
      <style>{`
        @keyframes tb-logo-float-l {
          0%,100% { transform:translateY(0) rotate(-13deg); }
          50%      { transform:translateY(${-9*s}px) rotate(-15deg); }
        }
        @keyframes tb-logo-float-c {
          0%,100% { transform:translateX(-50%) translateY(0) rotate(1deg); }
          50%      { transform:translateX(-50%) translateY(${-11*s}px) rotate(0deg); }
        }
        @keyframes tb-logo-float-r {
          0%,100% { transform:translateY(0) rotate(12deg); }
          50%      { transform:translateY(${-8*s}px) rotate(14deg); }
        }
        @keyframes tb-logo-env {
          0%,100% { transform:translateX(-50%) translateY(0); }
          50%      { transform:translateX(-50%) translateY(${-6*s}px); }
        }
        @keyframes tb-logo-heart {
          0%,100%  { transform:translateX(-50%) scale(1); }
          50%       { transform:translateX(-50%) scale(1.18); }
          55%       { transform:translateX(-50%) scale(1); }
          60%       { transform:translateX(-50%) scale(1.1); }
          65%       { transform:translateX(-50%) scale(1); }
        }
        @keyframes tb-logo-rays {
          0%,40%,100% { opacity:0; transform:translateX(-50%) scale(0.5); }
          55%          { opacity:0.85; transform:translateX(-50%) scale(1); }
          70%          { opacity:0; transform:translateX(-50%) scale(1.4); }
        }
        @keyframes tb-logo-rise {
          0%,35%,100% { opacity:0; transform:translateY(0); }
          50%  { opacity:1; transform:translateY(${-10*s}px); }
          75%  { opacity:0; transform:translateY(${-24*s}px); }
        }
      `}</style>

      <div style={{ width: w, height: h, position: "relative" }}>

        {/* Baby photo — left */}
        <div style={{
          position: "absolute", top: Math.round(4*s), left: Math.round(4*s), zIndex: 5,
          filter: `drop-shadow(0 ${2*s}px ${5*s}px rgba(0,0,0,0.13))`,
          transform: "rotate(-13deg)",
          ...animStyle("tb-logo-float-l"),
        }}>
          <svg width={Math.round(60*s)} height={Math.round(50*s)} viewBox="0 0 60 50">
            <rect x="0" y="0" width="60" height="50" rx="3" fill="#FAF7F2" stroke="#E8DDD0" strokeWidth="1.5"/>
            <rect x="3" y="3" width="54" height="34" rx="2" fill="#FFF0E8"/>
            <path d="M10 30 Q30 19 50 30" stroke="#D4A878" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
            <path d="M10 30 L10 36" stroke="#D4A878" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M50 30 L50 36" stroke="#D4A878" strokeWidth="1.5" strokeLinecap="round"/>
            <ellipse cx="30" cy="26" rx="9" ry="6" fill="#FFDDCC" opacity="0.9"/>
            <circle cx="30" cy="18" r="6.5" fill="#FFDDCC"/>
            <path d="M27 18 Q28 17 29 18" stroke="#C4906C" strokeWidth="0.9" fill="none" strokeLinecap="round"/>
            <path d="M31 18 Q32 17 33 18" stroke="#C4906C" strokeWidth="0.9" fill="none" strokeLinecap="round"/>
            <path d="M28 21 Q30 23 32 21" stroke="#C4906C" strokeWidth="0.9" fill="none" strokeLinecap="round"/>
            <path d="M27 12 Q30 9 33 12" stroke="#C4906C" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
            <circle cx="20" cy="26" r="2.5" fill="#FFDDCC"/>
            <circle cx="14" cy="10" r="1.5" fill="#F5C878" opacity="0.8"/>
            <circle cx="46" cy="9"  r="1.5" fill="#F5C878" opacity="0.8"/>
            <rect x="3" y="39" width="54" height="8" rx="1" fill="#FFF8F4"/>
          </svg>
        </div>

        {/* Couple photo — centre */}
        <div style={{
          position: "absolute", top: 0, left: "50%",
          transform: "translateX(-50%) rotate(1deg)", zIndex: 5,
          filter: `drop-shadow(0 ${2*s}px ${5*s}px rgba(0,0,0,0.15))`,
          ...animStyle("tb-logo-float-c", "5s", "0.4s"),
        }}>
          <svg width={Math.round(64*s)} height={Math.round(52*s)} viewBox="0 0 64 52">
            <rect x="0" y="0" width="64" height="52" rx="3" fill="#FAF7F2" stroke="#E8DDD0" strokeWidth="1.5"/>
            <rect x="3" y="3" width="58" height="36" rx="2" fill="#F0EAF8"/>
            <rect x="3" y="3" width="58" height="19" rx="2" fill="#F8E8D0" opacity="0.7"/>
            <rect x="3" y="27" width="58" height="12" fill="#E8D8C0" opacity="0.5"/>
            <circle cx="21" cy="17" r="5.5" fill="#C4906C"/>
            <path d="M21 23 L21 34" stroke="#8B6040" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M15 27 L21 25 L27 27" stroke="#8B6040" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
            <circle cx="43" cy="18" r="5" fill="#D4A880"/>
            <path d="M43 24 L43 34" stroke="#A07050" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M37 28 L43 26 L49 28" stroke="#A07050" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
            <path d="M27 28 Q32 26 37 28" stroke="#C4906C" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
            <path d="M32 9 C32 9 28 5 28 8 C28 11 32 13 32 13 C32 13 36 11 36 8 C36 5 32 9 32 9Z" fill="#D4607C" opacity="0.85"/>
            <circle cx="52" cy="8" r="4.5" fill="#F5C870" opacity="0.8"/>
            <rect x="3" y="41" width="58" height="8" rx="1" fill="#FAF4F8"/>
          </svg>
        </div>

        {/* Elder photo — right */}
        <div style={{
          position: "absolute", top: Math.round(4*s), right: Math.round(4*s), zIndex: 5,
          filter: `drop-shadow(0 ${2*s}px ${5*s}px rgba(0,0,0,0.13))`,
          transform: "rotate(12deg)",
          ...animStyle("tb-logo-float-r", "5s", "0.8s"),
        }}>
          <svg width={Math.round(60*s)} height={Math.round(50*s)} viewBox="0 0 60 50">
            <rect x="0" y="0" width="60" height="50" rx="3" fill="#FAF7F2" stroke="#E8DDD0" strokeWidth="1.5"/>
            <rect x="3" y="3" width="54" height="34" rx="2" fill="#EEF4EE"/>
            <rect x="42" y="10" width="4" height="22" rx="2" fill="#8B7050" opacity="0.7"/>
            <ellipse cx="44" cy="10" rx="9" ry="9" fill="#6A9A5A" opacity="0.6"/>
            <rect x="3" y="30" width="54" height="7" fill="#C4D4B0" opacity="0.5"/>
            <rect x="8"  y="27" width="26" height="3" rx="1" fill="#A07850" opacity="0.8"/>
            <rect x="10" y="30" width="3"  height="6" rx="1" fill="#A07850" opacity="0.8"/>
            <rect x="28" y="30" width="3"  height="6" rx="1" fill="#A07850" opacity="0.8"/>
            <circle cx="17" cy="19" r="5" fill="#C4A080"/>
            <path d="M12 16 Q17 11 22 16" fill="#F0EEE8" stroke="#E0DCCC" strokeWidth="0.5"/>
            <path d="M17 24 L17 29" stroke="#8B6840" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M12 26 L17 24 L21 26" stroke="#8B6840" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
            <path d="M21 26 L23 34" stroke="#A07850" strokeWidth="1.3" strokeLinecap="round"/>
            <circle cx="33" cy="20" r="4.5" fill="#D4B090"/>
            <path d="M28 17 Q33 13 38 17" fill="#F0EEE8" stroke="#E0DCCC" strokeWidth="0.5"/>
            <path d="M33 25 L33 29" stroke="#A07050" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="25" cy="22" r="3" fill="#FFDDCC"/>
            <path d="M25 25 L25 30" stroke="#C4906C" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M46 17 Q48 14 50 17 Q48 20 46 17Z" fill="#C070A0" opacity="0.6"/>
            <path d="M46 17 Q44 14 42 17 Q44 20 46 17Z" fill="#D08090" opacity="0.5"/>
            <rect x="3" y="39" width="54" height="8" rx="1" fill="#F4F8F4"/>
          </svg>
        </div>

        {/* Main envelope */}
        <div style={{
          position: "absolute", bottom: 0, left: "50%",
          transform: "translateX(-50%)", zIndex: 6,
          ...animStyle("tb-logo-env"),
        }}>
          <svg width={Math.round(168*s)} height={Math.round(114*s)} viewBox="0 0 168 114">
            <rect x="2" y="2" width="164" height="110" rx="9" fill={c.env1Body} stroke={c.env1Stroke} strokeWidth="2.5"/>
            <rect x="2" y="2" width="164" height="22" rx="9" fill={c.env2Body} opacity="0.6"/>
            <path d="M2 2 L84 55 L166 2" stroke={c.env1Stroke} strokeWidth="2" fill={c.envFlap} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 112 L60 65" stroke={c.gold} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
            <path d="M166 112 L106 65" stroke={c.gold} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
            <line x1="32" y1="75" x2="136" y2="75" stroke={c.gold} strokeWidth="1" strokeLinecap="round" opacity="0.35"/>
            <line x1="32" y1="86" x2="116" y2="86" stroke={c.gold} strokeWidth="1" strokeLinecap="round" opacity="0.28"/>
            <line x1="32" y1="97" x2="96"  y2="97" stroke={c.gold} strokeWidth="1" strokeLinecap="round" opacity="0.2"/>
          </svg>
        </div>

        {/* Light rays */}
        <div style={{
          position: "absolute", bottom: Math.round(22*s), left: "50%",
          zIndex: 8, opacity: animated ? 0 : 0.4,
          ...animStyle("tb-logo-rays"),
        }}>
          <svg width={Math.round(50*s)} height={Math.round(50*s)} viewBox="0 0 50 50">
            {[
              [25,2,25,10],[25,40,25,48],[2,25,10,25],[40,25,48,25],
              [8,8,13,13],[42,8,37,13],[8,42,13,37],[42,42,37,37],
            ].map(([x1,y1,x2,y2],i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={c.gold} strokeWidth={i<4?"1.5":"1.2"}
                strokeLinecap="round" opacity={i<4?"0.9":"0.65"}/>
            ))}
          </svg>
        </div>

        {/* Heart seal */}
        <div style={{
          position: "absolute", bottom: Math.round(13*s), left: "50%",
          transform: "translateX(-50%)", zIndex: 11,
          ...animStyle("tb-logo-heart"),
        }}>
          <svg width={Math.round(38*s)} height={Math.round(36*s)} viewBox="0 0 38 36">
            <circle cx="19" cy="19" r="17" fill={c.heartGlow}/>
            <circle cx="19" cy="19" r="13" fill={c.heartGlow}/>
            <path d="M19 30 C19 30 3.5 21 3.5 11.5 C3.5 7 7 3.5 11.5 3.5 C15 3.5 17.5 6 19 8.5 C20.5 6 23 3.5 26.5 3.5 C31 3.5 34.5 7 34.5 11.5 C34.5 21 19 30 19 30Z" fill={c.heart}/>
            <path d="M12.5 9.5 C11.5 8.5 10 9.5 10 11 C10 13.5 12.5 15 14.5 16.5" stroke={c.gold} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.5"/>
          </svg>
        </div>

        {/* Sparkles */}
        {animated && [
          { b: 43*s, l: 48*s,  d:"0.5s", bg: c.gold,       w:5 },
          { b: 39*s, l: 72*s,  d:"0.9s", bg: c.gold,       w:4 },
          { b: 43*s, r: 48*s,  d:"0.7s", bg: c.gold,       w:5 },
          { b: 37*s, l: 90*s,  d:"1.1s", bg: c.gold,       w:3 },
          { b: 39*s, r: 62*s,  d:"1.3s", bg: "#7CA87C",    w:3 },
          { b: 41*s, l: 58*s,  d:"1.6s", bg: c.heart,      w:4 },
        ].map((sp,i) => (
          <div key={i} style={{
            position:"absolute", bottom: sp.b,
            left: "l" in sp ? sp.l : undefined,
            right: "r" in sp ? sp.r : undefined,
            width: sp.w, height: sp.w,
            borderRadius:"50%", background: sp.bg,
            opacity:0, zIndex:12,
            animation:`tb-logo-rise 5s ease-out ${sp.d} infinite`,
          }}/>
        ))}
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap: Math.round(8*s) }}>
          <div style={{
            fontFamily:"'Cormorant Garamond', Georgia, serif",
            fontSize: Math.round(28*s),
            fontWeight: 500,
            color: c.wordmark,
            letterSpacing: Math.round(6*s),
            textAlign:"center",
          }}>
            TIME BRIDGE
          </div>
          <div style={{ width: Math.round(52*s), height:1, background: c.sep }}/>
          <div style={{
            fontFamily:"'Lato', sans-serif",
            fontSize: Math.round(10*s),
            color: c.tagline,
            letterSpacing: Math.round(3*s),
            textTransform:"uppercase",
            textAlign:"center",
          }}>
            My love stays, always
          </div>
        </div>
      )}
    </div>
  );
}
