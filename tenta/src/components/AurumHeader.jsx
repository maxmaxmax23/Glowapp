import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * AurumHeader Component
 * 
 * @param {string} title - The main screen title
 * @param {string} subtitle - An optional smaller subtitle above the title
 * @param {'immersive' | 'stack'} variant - 'immersive' has no back button and huge text. 'stack' has a back button and slightly smaller text.
 * @param {React.ReactNode} rightAction - Optional action button (e.g., Save, Add) on the right side
 */
export default function AurumHeader({ title, subtitle, variant = 'stack', rightAction }) {
    const navigate = useNavigate();

    return (
        <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full flex items-center justify-between py-6 px-4 md:px-8`}
        >
            <div className="flex items-center gap-4">
                {variant === 'stack' && (
                    <button
                        onClick={() => navigate(-1)}
                        className="aurum-btn-icon-circular"
                        aria-label="Go back"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                )}

                <div className="flex flex-col">
                    {subtitle && (
                        <span className="aurum-subtitle mb-1">{subtitle}</span>
                    )}
                    <h1 className={variant === 'immersive' ? 'aurum-title-immersive' : 'aurum-title-stack'}>
                        {title}
                    </h1>
                </div>
            </div>

            {rightAction && (
                <div>
                    {rightAction}
                </div>
            )}
        </motion.header>
    );
}
