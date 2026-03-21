import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { FaChartLine, FaStore, FaCashRegister, FaUsers, FaWhatsapp, FaSearch } from "react-icons/fa";
import { FiLogIn, FiLogOut } from "react-icons/fi";
import { HiUserAdd } from "react-icons/hi";
import { MdSpaceDashboard, MdSell } from "react-icons/md";
import { useMode } from "../context/UserModeContext";
import Logo from "../images/me2sell-logo.png";
import EnyotronicsLogo from "../images/enyotronics-logo.png";
import SalebookIllustration from "../images/salesbook-illustration2.png";
import BuyerImg from "../images/buy.png";

/* ── Floating orb background ─────────────────────────────────── */
function Orbs({ seller }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <motion.div
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-20
          ${seller ? "bg-blue-500" : "bg-green-400"}`}
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className={`absolute -bottom-40 -right-24 w-[600px] h-[600px] rounded-full blur-3xl opacity-15
          ${seller ? "bg-indigo-400" : "bg-blue-400"}`}
      />
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        className={`absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full blur-3xl opacity-10
          ${seller ? "bg-cyan-400" : "bg-emerald-400"}`}
      />
    </div>
  );
}

/* ── Animated counter ────────────────────────────────────────── */
function Counter({ to, suffix = "" }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const step = Math.ceil(to / 60);
    const timer = setInterval(() => {
      setCount(c => { if (c + step >= to) { clearInterval(timer); return to; } return c + step; });
    }, 16);
    return () => clearInterval(timer);
  }, [to]);
  return <>{count.toLocaleString()}{suffix}</>;
}

/* ── Seller feature card ─────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc, gradient, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="relative group bg-white rounded-3xl p-7 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 bg-gradient-to-br ${gradient}`} />
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} mb-5 shadow-lg`}>
        <Icon className="text-white text-2xl" />
      </div>
      <h4 className="font-bold text-gray-900 text-lg mb-2">{title}</h4>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}

/* ── Buyer step card ─────────────────────────────────────────── */
function StepCard({ icon: Icon, step, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -6 }}
      className="relative bg-white rounded-3xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 text-center group"
    >
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-green-600 text-white text-sm font-black flex items-center justify-center shadow-md">
        {step}
      </div>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mb-5 shadow-lg">
        <Icon className="text-white text-2xl" />
      </div>
      <h4 className="font-bold text-gray-900 text-lg mb-2">{title}</h4>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}

/* ── BUYER HOME ──────────────────────────────────────────────── */
function BuyerHome({ user }) {
  const words = ["Faster", "Smarter", "Easier", "Better"];
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % words.length), 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-center px-6 md:px-16 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="relative z-10 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-bold px-4 py-2 rounded-full mb-6 border border-green-200"
            >
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live Marketplace · Sellers Online Now
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] text-gray-900"
            >
              Discover Products{" "}
              <span className="block mt-1">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={wordIdx}
                    initial={{ opacity: 0, y: 20, rotateX: -90 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, y: -20, rotateX: 90 }}
                    transition={{ duration: 0.4 }}
                    className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent"
                  >
                    {words[wordIdx]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-6 text-gray-600 text-lg leading-relaxed max-w-md mx-auto md:mx-0"
            >
              Browse real products from real local businesses.
              View details, check seller profiles and reach sellers instantly via WhatsApp or call. No middlemen.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start"
            >
              <Link to="/marketplace"
                className="group relative inline-flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-green-700 transition-all duration-200 shadow-xl shadow-green-600/30 hover:shadow-2xl hover:shadow-green-600/40 hover:-translate-y-0.5">
                <FaSearch size={15} />
                Browse Marketplace
                <motion.span
                  className="absolute inset-0 rounded-2xl bg-white/20"
                  initial={{ scale: 0, opacity: 0 }}
                  whileTap={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              </Link>
              {!user && (
                <Link to="/signup"
                  className="inline-flex items-center gap-2 border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-2xl font-bold text-base hover:border-green-500 hover:text-green-600 transition-all duration-200">
                  <HiUserAdd size={16} /> Create Account
                </Link>
              )}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 flex gap-8 justify-center md:justify-start"
            >
              {[
                { to: 500, suffix: "+", label: "Products" },
                { to: 50, suffix: "+", label: "Sellers" },
                { to: 100, suffix: "%", label: "Free to Browse" },
              ].map(({ to, suffix, label }) => (
                <div key={label}>
                  <p className="text-2xl font-black text-gray-900"><Counter to={to} suffix={suffix} /></p>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden md:flex justify-center"
          >
            <motion.div
              animate={{ y: [0, -16, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src={BuyerImg} alt="Marketplace" className="w-[420px] drop-shadow-2xl" />
            </motion.div>
            {/* Floating badges */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute top-8 -left-6 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2"
            >
              <FaWhatsapp className="text-green-500 text-xl" />
              <div>
                <p className="text-xs font-bold text-gray-800">Contact Seller</p>
                <p className="text-[10px] text-gray-400">Instant WhatsApp</p>
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              className="absolute bottom-16 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3"
            >
              <p className="text-xs font-bold text-gray-800">🛒 Added to Cart</p>
              <p className="text-[10px] text-gray-400">Nike Air Max · ₦45,000</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative py-24 px-6 md:px-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-green-600 bg-green-50 px-4 py-2 rounded-full mb-4">
              Simple Process
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900">How It Works</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10 mt-8">
            <StepCard icon={FaSearch} step="1" title="Browse Products" desc="Explore hundreds of real products from local businesses by category or search." delay={0} />
            <StepCard icon={FaStore} step="2" title="View Seller Info" desc="See the seller's business details, location, contact info and all their listed products." delay={0.1} />
            <StepCard icon={FaWhatsapp} step="3" title="Contact Instantly" desc="Reach sellers directly via call or WhatsApp. No delays, no middlemen." delay={0.2} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white p-12 md:p-16 rounded-[2rem] overflow-hidden text-center shadow-2xl shadow-green-600/30"
          >
            {/* Decorative circles */}
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/10" />

            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative text-4xl md:text-5xl font-extrabold"
            >
              Ready to find what you need?
            </motion.h3>
            <p className="relative mt-4 text-white/80 text-lg max-w-md mx-auto">
              Join thousands of buyers connecting with local sellers every day.
            </p>
            <Link
              to={user ? "/marketplace" : "/signup"}
              className="relative inline-flex items-center gap-2 mt-8 bg-white text-green-700 px-8 py-4 rounded-2xl font-bold text-base hover:bg-green-50 transition shadow-xl hover:-translate-y-0.5 duration-200"
            >
              {user ? "Start Browsing" : "Get Started Free"}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

/* ── SELLER HOME ─────────────────────────────────────────────── */
function SellerHome({ user, dashboardPath }) {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -60]);

  const features = [
    { icon: FaStore, title: "Product Management", desc: "Add, categorize and track all your inventory in seconds.", gradient: "from-blue-500 to-indigo-600", delay: 0 },
    { icon: FaCashRegister, title: "Quick Sales Recording", desc: "Fast and intuitive checkout. Record every sale with one tap.", gradient: "from-emerald-500 to-teal-600", delay: 0.1 },
    { icon: FaUsers, title: "Staff Management", desc: "Assign roles, set permissions and track staff performance.", gradient: "from-violet-500 to-purple-600", delay: 0.2 },
    { icon: FaChartLine, title: "Business Insights", desc: "Clear revenue and profit reports at a glance, every day.", gradient: "from-orange-500 to-rose-500", delay: 0.3 },
  ];

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-center px-6 md:px-16 overflow-hidden">
        <motion.div style={{ y: heroY }} className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="relative z-10 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-bold px-4 py-2 rounded-full mb-6 border border-blue-200"
            >
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Smart Business Record Book
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] text-gray-900"
            >
              Run Your Business{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block mt-1">
                Like a Pro
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-6 text-gray-600 text-lg leading-relaxed max-w-md mx-auto md:mx-0"
            >
              Manage sales, track inventory, monitor staff and grow your business. All from one beautiful dashboard.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start"
            >
              <Link to={user ? dashboardPath : "/signup"}
                className="group relative inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-blue-700 transition-all duration-200 shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 hover:-translate-y-0.5">
                <MdSpaceDashboard size={18} />
                {user ? "Go to Dashboard" : "Get Started Free"}
              </Link>

              {/* Marketplace teaser */}
              <Link to="/marketplace"
                className="inline-flex items-center gap-2 border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-2xl font-bold text-base hover:border-green-500 hover:text-green-600 transition-all duration-200">
                <FaSearch size={14} /> Browse Marketplace
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 flex gap-8 justify-center md:justify-start"
            >
              {[
                { to: 1000, suffix: "+", label: "Sales Recorded" },
                { to: 200, suffix: "+", label: "Businesses" },
                { to: 99, suffix: "%", label: "Uptime" },
              ].map(({ to, suffix, label }) => (
                <div key={label}>
                  <p className="text-2xl font-black text-gray-900"><Counter to={to} suffix={suffix} /></p>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden md:flex justify-center"
          >
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src={SalebookIllustration} alt="Dashboard" className="w-[420px] drop-shadow-2xl" />
            </motion.div>
            {/* Floating badge */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-10 -left-6 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3"
            >
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                <FaChartLine className="text-green-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">Today's Revenue</p>
                <p className="text-sm font-black text-green-600">₦128,500</p>
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-16 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3"
            >
              <p className="text-[10px] text-gray-400 font-medium">New Sale Recorded</p>
              <p className="text-xs font-bold text-gray-900 mt-0.5">₦12,000 · iPhone Case</p>
              <p className="text-[10px] text-green-500 mt-0.5 font-medium">✓ Just now</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="relative py-24 px-6 md:px-16 bg-gray-50/80">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-4 border border-blue-100">
              Everything You Need
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900">Why Choose Me2sell?</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">Simple, powerful tools to help you manage and grow your business every day.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* MARKETPLACE BRIDGE */}
      <section className="py-20 px-6 md:px-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-[2rem] p-10 md:p-14 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

            <div className="relative text-center md:text-left">
              <span className="inline-block text-xs font-bold tracking-widest uppercase text-green-400 mb-3">
                Also Available
              </span>
              <h3 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
                Reach Buyers on Our<br />
                <span className="text-green-400">Marketplace</span>
              </h3>
              <p className="mt-4 text-gray-400 max-w-md mx-auto md:mx-0">
                Publish your products to Me2sell Marketplace and let buyers discover your business. For free.
              </p>
            </div>

            <div className="relative flex flex-col sm:flex-row gap-4 shrink-0">
              <Link to="/marketplace"
                className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-7 py-4 rounded-2xl font-bold hover:bg-green-500 transition-all duration-200 shadow-lg shadow-green-600/30 hover:-translate-y-0.5">
                <FaSearch size={14} /> Explore Marketplace
              </Link>
              <Link to={user ? dashboardPath : "/signup"}
                className="inline-flex items-center justify-center gap-2 border border-gray-600 text-gray-300 px-7 py-4 rounded-2xl font-bold hover:border-gray-400 hover:text-white transition-all duration-200">
                <MdSpaceDashboard size={16} /> My Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-6 md:px-16 bg-gray-50/80">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-14">Up and Running in Minutes</h2>
          </motion.div>
          <div className="relative flex flex-col md:flex-row gap-0 items-stretch">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[16.6%] right-[16.6%] h-0.5 bg-gradient-to-r from-blue-200 via-indigo-200 to-blue-200 z-0" />
            {[
              { n: "01", title: "Create Account", desc: "Sign up in seconds. No credit card needed." },
              { n: "02", title: "Add Products", desc: "Upload your products with images and prices." },
              { n: "03", title: "Start Selling", desc: "Record sales and track your business growth." },
            ].map(({ n, title, desc }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative flex-1 flex flex-col items-center text-center px-6 py-8"
              >
                <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-blue-600/30 mb-5">
                  {n}
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">{title}</h4>
                <p className="text-gray-500 text-sm">{desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
            <Link to={user ? dashboardPath : "/signup"}
              className="inline-flex items-center gap-2 mt-10 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition shadow-xl shadow-blue-600/30 hover:-translate-y-0.5 duration-200">
              {user ? "Go to Dashboard" : "Start for Free"}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

/* ── MAIN LANDING ────────────────────────────────────────────── */
export default function Landing() {
  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [userRole,    setUserRole]    = useState(null);

  const menuRef       = useRef(null);
  const menuButtonRef = useRef(null);

  const { mode, toggleMode, isSeller, isBuyer } = useMode();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          setUserRole(snap.exists() ? (snap.data().role || "admin") : "admin");
        } catch {
          setUserRole("admin");
        }
      } else {
        setUserRole(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target) &&
          menuButtonRef.current && !menuButtonRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [menuOpen]);

  const logout = async () => { await auth.signOut(); setUserRole(null); };

  const dashboardPath  = isSeller ? (userRole === "staff" ? "/staff/dashboard" : "/dashboard") : "/marketplace";
  const dashboardLabel = isSeller ? (userRole === "staff" ? "Staff Dashboard" : "Dashboard") : "Marketplace";

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-x-hidden">
      <Orbs seller={isSeller} />

      {/* ── HEADER ── */}
      <header className="z-50 sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Link to="/">
              <img src={Logo} alt="Me2sell" className="h-8 w-auto" />
            </Link>
          </motion.div>

          {/* Mode toggle — desktop */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-full"
          >
            <button onClick={() => !isSeller && toggleMode()}
              className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all duration-200
                ${isSeller ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:text-gray-700"}`}>
              Seller
            </button>
            <button onClick={() => !isBuyer && toggleMode()}
              className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all duration-200
                ${isBuyer ? "bg-green-600 text-white shadow-md" : "text-gray-500 hover:text-gray-700"}`}>
              Buyer
            </button>
          </motion.div>

          {/* Nav — desktop */}
          <motion.nav
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:flex items-center gap-4"
          >
            {!authLoading && (
              user ? (
                <>
                  <Link to={dashboardPath}
                    className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600 transition px-3 py-2 rounded-xl hover:bg-gray-100">
                    {isSeller ? <MdSpaceDashboard size={16} /> : <MdSell size={16} />}
                    {dashboardLabel}
                  </Link>
                  <button onClick={logout}
                    className="flex items-center gap-1.5 text-sm font-semibold text-red-500 hover:text-red-600 transition px-3 py-2 rounded-xl hover:bg-red-50">
                    <FiLogOut size={15} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login"
                    className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600 transition px-3 py-2 rounded-xl hover:bg-gray-100">
                    <FiLogIn size={15} /> Login
                  </Link>
                  <Link to="/signup"
                    className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-600/20">
                    <HiUserAdd size={15} /> Sign Up
                  </Link>
                </>
              )
            )}
          </motion.nav>

          {/* Mobile menu button */}
          <button ref={menuButtonRef} onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2">
            <motion.span animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 8 : 0 }}
              className="block w-6 h-0.5 bg-gray-800 rounded-full origin-center" />
            <motion.span animate={{ opacity: menuOpen ? 0 : 1 }}
              className="block w-6 h-0.5 bg-gray-800 rounded-full" />
            <motion.span animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -8 : 0 }}
              className="block w-6 h-0.5 bg-gray-800 rounded-full origin-center" />
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl overflow-hidden"
            >
              <div className="px-6 py-4 space-y-3">
                {/* Mode toggle mobile */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full w-fit">
                  <button onClick={() => !isSeller && toggleMode()}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${isSeller ? "bg-blue-600 text-white" : "text-gray-500"}`}>
                    Seller
                  </button>
                  <button onClick={() => !isBuyer && toggleMode()}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${isBuyer ? "bg-green-600 text-white" : "text-gray-500"}`}>
                    Buyer
                  </button>
                </div>

                {user ? (
                  <>
                    <Link to={dashboardPath} onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition py-2">
                      {dashboardLabel}
                    </Link>
                    <Link to="/marketplace" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-green-600 transition py-2">
                      Marketplace
                    </Link>
                    <button onClick={() => { logout(); setMenuOpen(false); }}
                      className="flex items-center gap-2 text-sm font-semibold text-red-500 py-2">
                      <FiLogOut size={14} /> Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-700 py-2">
                      <FiLogIn size={14} /> Login
                    </Link>
                    <Link to="/signup" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 px-4 py-2.5 rounded-xl">
                      <HiUserAdd size={14} /> Sign Up
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 flex-1">
        <AnimatePresence mode="wait">
          {isBuyer ? (
            <motion.div key="buyer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <BuyerHome user={user} />
            </motion.div>
          ) : (
            <motion.div key="seller" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
              <SellerHome user={user} dashboardPath={dashboardPath} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-gray-100 bg-white/80 backdrop-blur-xl py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="Me2sell" className="h-6 w-auto opacity-60" />
            <span className="text-gray-400 text-sm">© {new Date().getFullYear()} Me2sell</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/support" className="text-gray-500 hover:text-blue-600 transition font-medium">Contact Us</Link>
            <Link to="/how-it-works" className="text-gray-500 hover:text-blue-600 transition font-medium">How It Works</Link>
            <Link to="/marketplace" className="text-gray-500 hover:text-green-600 transition font-medium">Marketplace</Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Powered by</span>
            <Link to="/enyotronics">
              <img src={EnyotronicsLogo} alt="Enyotronics" className="h-5 w-auto opacity-70" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}