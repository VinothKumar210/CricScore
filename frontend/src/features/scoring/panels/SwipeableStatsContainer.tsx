import React, { useState, useRef } from 'react';

interface SwipeableStatsContainerProps {
    panels: React.ReactNode[];
}

export const SwipeableStatsContainer: React.FC<SwipeableStatsContainerProps> = ({ panels }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const scrollLeft = scrollRef.current.scrollLeft;
        const width = scrollRef.current.offsetWidth;
        const index = Math.round(scrollLeft / width);
        if (index !== activeIndex) {
            setActiveIndex(index);
        }
    };

    return (
        <div className="w-full relative flex flex-col bg-cardAlt border-t shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.2)] z-10">
            {/* Scroll Container */}
            <div 
                ref={scrollRef}
                className="w-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide overscroll-x-contain"
                onScroll={handleScroll}
                style={{ scrollBehavior: 'smooth' }}
            >
                {panels.map((panel, idx) => (
                    <div key={idx} className="w-full flex-shrink-0 snap-center min-w-full p-4 min-h-[300px]">
                        {panel}
                    </div>
                ))}
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-2 py-3 bg-cardAlt/80 backdrop-blur-sm sticky bottom-0">
                {panels.map((_, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => {
                            if (scrollRef.current) {
                                scrollRef.current.scrollTo({
                                    left: idx * scrollRef.current.offsetWidth,
                                    behavior: 'smooth'
                                });
                            }
                        }}
                        className={`transition-all duration-300 rounded-full ${
                            idx === activeIndex 
                            ? 'w-6 h-1.5 bg-primary shadow-sm shadow-primary/40' 
                            : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                        }`} 
                        aria-label={`Go to panel ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};
