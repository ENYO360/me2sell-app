import React, { useState, useEffect } from "react";
import { auth } from "../firebase/config";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Logo from "../images/me2sell-logo.png";
import { FiLogIn, FiLogOut } from "react-icons/fi";
import { HiUserAdd } from "react-icons/hi";
import { MdSpaceDashboard } from "react-icons/md";
import EnyotronicsLogo from "../images/enyotronics-logo.png";
import {
    FaShieldAlt,
    FaChevronDown,
    FaDatabase,
    FaBullseye,
    FaCogs,
    FaCloud,
    FaClock,
    FaTrashAlt,
    FaUserCheck,
    FaChild,
    FaSyncAlt,
    FaEnvelope,
} from "react-icons/fa";

export default function PrivacyPolicy() {
    const LAST_UPDATED = "September 15, 2026";

    const sections = [
        {
            id: "info-we-collect",
            icon: FaDatabase,
            title: "Information We Collect",
            body: `We collect the information you give us directly, and a small amount of information generated automatically as you use Me2sell.\n\nAccount information: your name, email address, password (stored in hashed form by Firebase Authentication), and business details such as business name, business type, address and country.\n\nBusiness data: products, categories, departments, prices, stock quantities, sales records, customer names/phone numbers you optionally add to receipts, and staff accounts you create (name, login credentials, assigned permissions).\n\nUsage & device information: basic technical data such as IP address, browser/device type, and app interaction logs, collected automatically to keep the service secure and reliable.`
        },
        {
            id: "why-we-collect",
            icon: FaBullseye,
            title: "Why We Collect It",
            body: `We collect this information only for purposes directly tied to running Me2sell:\n\n• To create and secure your account and let you log in.\n• To let you record sales, manage inventory, and generate reports.\n• To let you invite and manage staff with appropriate permission levels.\n• To generate receipts and sales reports you choose to create or share.\n• To detect, prevent, and respond to fraud, abuse, or technical issues.\n• To communicate with you about your account or respond to support requests.\n\nWe do not collect information for advertising purposes, and we do not sell your data.`
        },
        {
            id: "how-used",
            icon: FaCogs,
            title: "How Information Is Used",
            body: `Your business data (products, sales, staff records) is used solely to power the features of your own account — it is not shared with other businesses using Me2sell, and it is not used to train any AI or machine learning models.\n\nAccount and usage information may be used in aggregate, anonymized form to understand how the app is used and to improve performance and reliability. Aggregated data of this kind cannot be used to identify you or your business.`
        },
        {
            id: "third-party",
            icon: FaCloud,
            title: "Firebase & Third-Party Services",
            body: `Me2sell is built on Google Firebase, and relies on the following Firebase services to operate:\n\n• Firebase Authentication — manages account sign-up, login, and password security.\n• Cloud Firestore — stores your business, product, sales, and staff data.\n• Firebase Storage — stores uploaded images such as product photos and the tutorial video on this page.\n\nThese services are provided by Google LLC and are governed by Google's own privacy and security practices, including data encryption in transit and at rest. We do not share your data with any other third party for marketing purposes. If we ever engage an additional service provider (e.g. for email delivery or PDF/report generation), it will only be to perform a task on our behalf, under confidentiality obligations, and never to sell or repurpose your data.`
        },
        {
            id: "data-retention",
            icon: FaClock,
            title: "Data Retention",
            body: `We retain your account and business data for as long as your account remains active, so that your sales history, reports, and inventory stay available to you.\n\nIf you stop using Me2sell, your data remains stored in case you return, but you may request permanent deletion at any time (see "Data Deletion" below). We may retain limited information for a reasonable period after deletion where required to comply with legal obligations, resolve disputes, or enforce our agreements.`
        },
        {
            id: "data-deletion",
            icon: FaTrashAlt,
            title: "Data Deletion",
            body: `You can request deletion of your account and associated business data at any time by contacting us using the details below, or via the Settings page if a self-service delete option is available in your version of the app.\n\nWhen you request deletion, we will permanently remove your account, product, sales, and staff records from our active systems, typically within 30 days, except where limited data must be retained for legal or accounting reasons. Staff accounts created under your business are deleted along with the business account, since they exist only as extensions of it.`
        },
        {
            id: "user-rights",
            icon: FaUserCheck,
            title: "Your Rights",
            body: `Depending on your location, you may have rights to:\n\n• Access the personal data we hold about you.\n• Correct inaccurate or incomplete data.\n• Request deletion of your data.\n• Export a copy of your data in a portable format.\n• Object to or restrict certain kinds of processing.\n• Withdraw consent, where processing is based on consent.\n\nTo exercise any of these rights, contact us using the information below. We will respond within a reasonable timeframe and may need to verify your identity before acting on a request.`
        },
        {
            id: "children",
            icon: FaChild,
            title: "Children's Privacy",
            body: `Me2sell is a business tool intended for use by adults operating or working for a business. It is not directed at children, and we do not knowingly collect personal information from anyone under the age of 18. If we become aware that we have inadvertently collected such information, we will delete it promptly.`
        },
        {
            id: "changes",
            icon: FaSyncAlt,
            title: "Changes to This Policy",
            body: `We may update this Privacy Policy from time to time as Me2sell evolves or as legal requirements change. If we make material changes, we will update the "Last updated" date below and, where appropriate, notify you directly (for example, by email or an in-app notice). We encourage you to review this page periodically.`
        },
    ];

    const [user, setUser] = useState(null);
    const [openId, setOpenId] = useState("info-we-collect");

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((u) => setUser(u));
        return () => unsub();
    }, []);

    const logout = async () => {
        await auth.signOut();
    };

    return (
        <>
            {/* HEADER */}
            <header className="w-full py-4 px-6 bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-7xl gap-4 mx-auto flex justify-between items-center">

                    {/* Logo */}
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <Link to="/" className="flex items-center gap-2">
                            <img src={Logo} alt="Me2sell Logo" className="w-12" />
                        </Link>
                    </motion.div>

                    {/* Navigation */}
                    <nav className="flex items-center gap-6 text-[15px] font-medium">
                        {user ? (
                            <>
                                <Link
                                    to="/dashboard"
                                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
                                >
                                    <MdSpaceDashboard size={20} /> Dashboard
                                </Link>

                                <button
                                    onClick={logout}
                                    className="flex items-center gap-2 text-red-600 hover:text-red-700 transition"
                                >
                                    <FiLogOut size={20} /> Logout
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-wrap justify-between gap-4">
                                <Link
                                    to="/login"
                                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
                                >
                                    <FiLogIn size={18} /> Login
                                </Link>

                                <Link
                                    to="/signup"
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
                                >
                                    <HiUserAdd size={20} /> Create Account
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            </header>

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
                <div className="max-w-6xl mx-auto">
                    {/* Page header */}
                    <motion.header
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg">
                                <FaShieldAlt className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-extrabold">Privacy Policy</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    How Me2sell collects, uses, and protects your information.
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 md:text-right">
                            Last updated: {LAST_UPDATED}
                        </p>
                    </motion.header>

                    {/* ─── INTRO CARD ─── */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8">
                        <p className="text-sm leading-relaxed">
                            Me2sell ("we", "us", "our") provides a point-of-sale and inventory management
                            application for small and growing businesses. This Privacy Policy explains what
                            information we collect when you use Me2sell, why we collect it, how it's used,
                            which third-party services we rely on, how long we keep it, how you can have it
                            deleted, and the rights you have over your own data. By creating an account or
                            using Me2sell, you agree to the practices described here.
                        </p>
                    </div>

                    {/* Detailed accordion */}
                    <div className="space-y-4">
                        {sections.map((s) => (
                            <PolicyAccordion
                                key={s.id}
                                id={s.id}
                                icon={s.icon}
                                title={s.title}
                                open={openId === s.id}
                                onToggle={() => setOpenId(openId === s.id ? null : s.id)}
                            >
                                <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-line">
                                    {s.body}
                                </div>
                            </PolicyAccordion>
                        ))}

                        {/* Contact — kept as its own highlighted card rather than a collapsible section, since it's the action people usually land here for */}
                        <div id="contact" className="bg-blue-600 text-white rounded-xl shadow p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <FaEnvelope className="w-5 h-5" />
                                <h3 className="font-semibold text-lg">Questions About This Policy?</h3>
                            </div>
                            <p className="text-sm text-blue-50 leading-relaxed">
                                If you have questions about this Privacy Policy, want to access, correct, or
                                delete your data, or want to report a concern, reach out to us and we'll get
                                back to you.
                            </p>
                            <Link
                                to="/support"
                                className="inline-block mt-4 bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition"
                            >
                                Contact Support
                            </Link>
                        </div>
                    </div>

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
                            <Link to="/privacy" className="text-gray-400 hover:text-blue-600 transition font-medium">Privacy Policy</Link>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Powered by</span>
                                <Link to="/enyotronics">
                                    <img src={EnyotronicsLogo} alt="Enyotronics" className="h-5 w-auto opacity-70" />
                                </Link>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}


// --------------------------
// Policy accordion helper (icon + title, mirrors Accordion in SalesBookGuide)
// --------------------------

function PolicyAccordion({ id, icon: Icon, title, children, open, onToggle }) {
    return (
        <div id={id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <button onClick={onToggle} className="w-full flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-left">
                    {Icon && (
                        <div className="bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-2 rounded-lg shrink-0">
                            <Icon className="w-4 h-4" />
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold">{title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">{open ? 'Open' : 'Click to expand'}</p>
                    </div>
                </div>
                <motion.div animate={{ rotate: open ? 180 : 0 }} className="text-gray-500 shrink-0">
                    <FaChevronDown />
                </motion.div>
            </button>

            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mt-4"
            >
                {open && <div className="pt-2 pl-0 md:pl-11">{children}</div>}
            </motion.div>
        </div>
    );
}