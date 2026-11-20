import { motion as Motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import "../styles/Premium.css";
import { useEffect, useState } from "react";

const Premium = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [checkoutReady, setCheckoutReady] = useState(Boolean(window.Razorpay));
  const paymentKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

  useEffect(() => {
    if (!paymentKey || window.Razorpay) {
      setCheckoutReady(Boolean(window.Razorpay));
      return undefined;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setCheckoutReady(true);
    script.onerror = () => setCheckoutReady(false);
    document.body.appendChild(script);
    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [paymentKey]);

  const handlePayment = (amount, planName) => {
    if (!paymentKey || !checkoutReady || !window.Razorpay) {
      setModalMessage("Secure checkout is not configured right now. Please try again later.");
      setIsModalOpen(true);
      return;
    }

    const options = {
      key: paymentKey,
      amount: amount * 100,
      currency: "INR",
      name: "Vital Sense",
      description: planName,
      handler: function () {
        setModalMessage("Payment received. Thank you for upgrading to Vital Sense Pro.");
        setIsModalOpen(true);
      },
      theme: {
        color: "#6f46c7",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", () => {
      setModalMessage("The payment could not be completed. No plan changes were made.");
      setIsModalOpen(true);
    });
    rzp.open();
  };

  const plans = [
    {
      title: "Free",
      price: "₹0",
      features: [
        "Limited conversations per day",
        "Basic AI therapy responses & guidance",
        "Mood tracking with limited prompts",
        "Simple journaling",
        "Google Ads support",
        "Community support & forums",
      ],
      button: "Continue Free",
    },
    {
      title: "Pro (Monthly)",
      price: "₹199/month",
      features: [
        "Unlimited conversations with AI therapist",
        "Smart session saving & conversation history",
        "Human-like voice replies for immersive guidance",
        "Daily emotional check-ins & guided journaling",
        "Goal setting, tracking & therapy exercises",
        "Emotional nudges & reminders based on your mood",
      ],
      button: "Upgrade to Pro",
    },
    {
      title: "Pro+ (Yearly)",
      price: "₹3,999/year",
      features: [
        "All Pro features",
        "Emotional check-ins & random therapy prompts",
        "Advanced journaling & AI analysis (mood insights, patterns, therapy suggestions)",
        "Customizable AI personality for therapy (friendly, motivational, calm, etc.)",
        "Premium themes & UI enhancements",
        "Priority response & early feature access",
        "Uses different models for powerful replies",
        "Exclusive Zen Theme",
        "Early access to new features",
      ],
      button: "Upgrade to Pro+",
    },
  ];

  return (
    <div className="premium-page">
      <Motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="premium-title"
      >
        Vital Sense Pro
      </Motion.h1>

      <p className="premium-sub">Unlock the full potential with Pro plans</p>

      <div className="plans-container">
        {plans.map((plan, idx) => (
          <Motion.div
            key={idx}
            className="plan-card glass-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: idx * 0.2 }}
          >
            <h2>{plan.title}</h2>
            <h3>{plan.price}</h3>
            <ul>
              {plan.features.map((f, i) => (
                <li key={i}>
                  <CheckCircle size={18} style={{ marginRight: "8px" }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              className="upgrade-btn"
              onClick={() => {
                if (plan.title === "Pro (Monthly)") {
                  handlePayment(199, "Pro Monthly");
                } else if (plan.title === "Pro+ (Yearly)") {
                  handlePayment(3999, "Pro+ Yearly");
                } else {
                  setModalMessage("You are already on the Free plan.");
                  setIsModalOpen(true);
                }
              }}
            >
              {plan.button}
            </button>
          </Motion.div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>{modalMessage}</p>
            <button onClick={() => setIsModalOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Premium;
