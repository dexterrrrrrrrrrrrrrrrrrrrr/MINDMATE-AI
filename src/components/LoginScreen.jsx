import React, { useEffect, useState } from "react";
import "../styles/LoginScreen.css";
import googleLogo from "../assets/google-logo.svg";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../firebase";

import gsap from "gsap";

let isPasswordFocused = false;
const LOOK_AWAY_X = -6; // LEFT
const LOOK_AWAY_Y = 0;  // CENTER


const LoginScreen = ({ onGoogleLogin, onGuestLogin, googleSubmitting = false, authError = "" }) => {
  const [authMode, setAuthMode] = useState("login");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    const chars = gsap.utils.toArray(".char");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    /* ================= ENTRANCE ================= */
    gsap.from(chars, {
      scaleY: 0,
      transformOrigin: "50% 100%",
      duration: 0.9,
      ease: "elastic.out(1, 0.55)",
      stagger: 0.15
    });

    /* ================= STORE HOME ================= */
    chars.forEach(char => {
      const move = char.querySelector(".char-move");
      gsap.set(move, { x: 0, y: 0 });
    });

    /* ================= EYES FOLLOW CURSOR ================= */
    let mx = innerWidth / 2;
    let my = innerHeight / 2;

    const handleMouseMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const followCursor = () => {
      chars.forEach(char => {
        char.querySelectorAll(".pupil").forEach(p => {

          // 👀 PASSWORD MODE → LOOK AWAY (LEFT & STABLE)
          if (isPasswordFocused) {
            gsap.to(p, {
              x: LOOK_AWAY_X,
              y: LOOK_AWAY_Y,
              duration: 0.35,
              ease: "power2.out",
              overwrite: true
            });
            return;
          }

          // 🖱️ NORMAL MODE → FOLLOW CURSOR
          const r = p.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const a = Math.atan2(my - cy, mx - cx);

          gsap.to(p, {
            x: Math.cos(a) * 3,
            y: Math.sin(a) * 3,
            duration: 0.25,
            overwrite: true
          });
        });
      });
    };
    gsap.ticker.add(followCursor);



    /* ================= CHARACTER ENGINE ================= */
    chars.forEach(char => {
      const mouth = char.querySelector(".mouth");
      const head = char.querySelector(".head");
      const body = char.querySelector(".body");

      const MOUTH = {
        closed: mouth.dataset.closed,
        open: mouth.dataset.open,
        laugh: mouth.dataset.laugh,
        nervous: mouth.dataset.nervous,
        smile: mouth.dataset.smile
      };

      let busy = false;

      char.talk = (speed = 0.08) => {
        if (busy) return;
        busy = true;

        gsap.timeline({
          onComplete: () => (busy = false)
        })
          .to(mouth, { attr: { d: MOUTH.open }, duration: speed })
          .to(head, { y: -2, duration: speed }, "<")
          .to(body, { scaleY: 0.96, scaleX: 1.02, duration: speed }, "<")
          .to(mouth, { attr: { d: MOUTH.closed }, duration: speed * 1.5 })
          .to(head, { y: 0, duration: speed * 1.5 }, "<")
          .to(body, { scale: 1, duration: speed * 1.5 }, "<");
      };

      char.laugh = () => {
        if (busy) return;
        busy = true;

        gsap.timeline({
          onComplete: () => (busy = false)
        })
          .to(mouth, { attr: { d: MOUTH.laugh }, duration: 0.12 })
          .to(head, { y: -4, repeat: 2, yoyo: true, duration: 0.1 })
          .to(mouth, { attr: { d: MOUTH.closed }, duration: 0.15 });
      };

      char.nervous = () => {
        gsap.to(mouth, { attr: { d: MOUTH.nervous }, duration: 0.15 });
      };

      char.smile = () => {
        gsap.to(mouth, { attr: { d: MOUTH.smile }, duration: 0.25 });
      };
    });

    /* ================= EMAIL TYPING ================= */
    let lastType = Date.now();
    const handleEmailInput = () => {
      const now = Date.now();
      const speed = Math.max(0.05, Math.min(0.15, (now - lastType) / 300));
      lastType = now;
      chars.forEach(c => c.talk(speed));
    };
    emailInput?.addEventListener("input", handleEmailInput);

    /* ================= PASSWORD REACTIONS ================= */
    const handlePasswordFocus = () => {
      isPasswordFocused = true;
      chars.forEach(c => c.nervous());
    };

    const handlePasswordBlur = () => {
      isPasswordFocused = false;
      chars.forEach(c => c.smile());
    };

    passwordInput?.addEventListener("focus", handlePasswordFocus);
    passwordInput?.addEventListener("blur", handlePasswordBlur);



    const handlePasswordInput = () => {
      const now = Date.now();
      const speed = Math.max(0.05, Math.min(0.15, (now - lastType) / 250));
      lastType = now;
      gsap.utils.random(chars).talk(speed);
    };
    passwordInput?.addEventListener("input", handlePasswordInput);

    /* ================= WANDER (ONE AT A TIME) ================= */
    const wanderOnce = char => {
      const move = char.querySelector(".char-move");
      gsap.timeline()
        .to(move, {
          x: gsap.utils.random(-40, 40),
          y: gsap.utils.random(-20, 20),
          duration: 3,
          ease: "sine.inOut"
        })
        .to(move, {
          x: 0,
          y: 0,
          duration: 3,
          ease: "sine.inOut"
        });
    };

    const wanderTimeline = gsap.timeline({ repeat: -1 }).to({}, {
      duration: gsap.utils.random(6, 9),
      onComplete: () => wanderOnce(gsap.utils.random(chars))
    });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      emailInput?.removeEventListener("input", handleEmailInput);
      passwordInput?.removeEventListener("focus", handlePasswordFocus);
      passwordInput?.removeEventListener("blur", handlePasswordBlur);
      passwordInput?.removeEventListener("input", handlePasswordInput);
      gsap.ticker.remove(followCursor);
      wanderTimeline.kill();
      gsap.killTweensOf(chars);
      chars.forEach((char) => gsap.killTweensOf(char.querySelectorAll("*")));
      isPasswordFocused = false;
    };
  }, []);

  function Character({ color, w, h }) {
    return (
      <svg className="char" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <g className="char-move">
          <rect className="body" width={w} height={h} rx={18} fill={color} />

          <g className="head" transform={`translate(${w / 2}, ${h * 0.35})`}>
            <g transform="translate(-16,0)">
              <g className="eye">
                <circle cx="6" cy="6" r="6" fill="#fff" />
                <circle className="pupil" cx="6" cy="6" r="3" fill="#000" />
              </g>
              <g className="eye" transform="translate(20,0)">
                <circle cx="6" cy="6" r="6" fill="#fff" />
                <circle className="pupil" cx="6" cy="6" r="3" fill="#000" />
              </g>

              <path
                className="mouth"
                data-closed="M4 26 L28 26"
                data-open="M4 24 Q16 40 28 24"
                data-laugh="M2 22 Q16 46 30 22"
                data-nervous="M6 26 L26 26"
                data-smile="M4 26 Q16 34 28 26"
                d="M4 26 L28 26"
                fill="none"
                stroke="#000"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          </g>
        </g>
      </svg>
    );
  }

  const handleEmailAuth = async () => {
    const email = document.getElementById("emailInput")?.value;
    const password = document.getElementById("passwordInput")?.value;

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    setAuthSubmitting(true);
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      alert(err.message || `${authMode === "signup" ? "Sign up" : "Login"} failed. Please try again.`);
    } finally {
      setAuthSubmitting(false);
    }
  };


  return (
    <div className="login-screen">

      <div className="gsap-scene">
        <Character color="#5b4bff" w={90} h={190} />
        <Character color="#797070" w={70} h={160} />
        <Character color="#ffd400" w={80} h={200} />
        <Character color="#ff8c2a" w={100} h={160} />
        <Character color="#ff2a8d" w={60} h={180} />
        <Character color="#14d8b8" w={75} h={190} />
        <Character color="#fc00d6" w={100} h={200} />
        <Character color="#f87373" w={200} h={200} />

      </div>


      <div className="login-box">
        <h1 className="title">
          Welcome to <span className="highlight">Vital Sense</span>
        </h1>
        <p className="subtitle">Your emotional wellness & career assistant</p>

        <button
          type="button"
          className="social-btn google"
          onClick={onGoogleLogin}
          disabled={googleSubmitting}
          aria-busy={googleSubmitting}
        >
          <img src={googleLogo} alt="" className="icon" />
          {googleSubmitting ? "Redirecting securely…" : "Continue with Google"}
        </button>

        {authError && <p className="login-auth-error" role="alert">{authError}</p>}

        <div className="divider"><span>or</span></div>


        <div className="input-group">
          <input type="email" id="emailInput" required />
          <label>Email</label>
        </div>

        <div className="input-group">
          <input type="password" id="passwordInput" required />
          <label>Password</label>
        </div>

        <div className="input-group">
          <button className="login-btn" onClick={handleEmailAuth} disabled={authSubmitting}>
            {authSubmitting ? "Please wait..." : authMode === "signup" ? "Create Account" : "Login with Email"}
          </button>
        </div>

        <a
          href="#"
          className="forgot-link"
          onClick={async (e) => {
            e.preventDefault();
            const email = document.getElementById("emailInput")?.value;
            if (!email) {
              alert("Enter your email first");
              return;
            }
            try {
              await sendPasswordResetEmail(auth, email);
              alert("Password reset email sent!");
            } catch (err) {
              alert(err.message);
            }
          }}
        >
          Forgot password?
        </a>

        <button className="guest-btn" onClick={onGuestLogin}>Try it first!</button>
        <a
          href="#"
          className="signup-text"
          onClick={(event) => {
            event.preventDefault();
            setAuthMode((mode) => mode === "login" ? "signup" : "login");
          }}
        >
          {authMode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
        </a>
      </div>
    </div>
  );
};

export default LoginScreen;
