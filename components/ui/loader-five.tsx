"use client";

import { motion } from "framer-motion";

export function LoaderFive({ text }: { text?: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3">

            {/* Animated dots */}
            <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                    <motion.span
                        key={i}
                        animate={{ y: [0, -10, 0] }}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.2,
                        }}
                        className="h-3 w-3 rounded-full bg-green-500"
                    />
                ))}
            </div>

            {/* Text */}
            {text && (
                <p className="text-sm text-gray-500 animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );
}