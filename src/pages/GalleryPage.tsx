import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import inaugGroupImg from '@/assets/gallery/inauguration-group-certificates.jpeg';
import inaugLampImg from '@/assets/gallery/inauguration-lamp-lighting.jpeg';
import inaugFelicitationImg from '@/assets/gallery/inauguration-felicitation.jpeg';
import winnerPranavCollageImg from '@/assets/gallery/winner-pranav-khot-collage.jpeg';
import winnerTukendraCollageImg from '@/assets/gallery/winner-tukendra-golegaonkar-collage.jpeg';
import certificatePranavImg from '@/assets/gallery/certificate-pranav-khot.jpeg';

const fadeInUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.4 },
};

// ------------------------------------------------------------------
// Replace this array with real previous-year event photos.
// Each item: { src, alt, year }. Drop images in src/assets/gallery/
// and import them the same way heroImg is imported above.
// ------------------------------------------------------------------
interface GalleryImage {
    src: string;
    alt: string;
    year: string;
}

const GALLERY_IMAGES: GalleryImage[] = [
    { src: inaugLampImg, alt: 'Inauguration lamp-lighting ceremony, Department of Mechanical Engineering, Walchand College of Engineering, Sangli', year: '2025' },
    { src: inaugFelicitationImg, alt: 'Felicitation of guests at the inauguration ceremony', year: '2025' },
    { src: inaugGroupImg, alt: 'Winning teams and organizers with certificates, AAYODHYAM 2025', year: '2025' },
    { src: winnerPranavCollageImg, alt: 'Pranav Khot receiving the Certificate of Achievement, Winner of AAYODHYAM 2025 Metallurgy Hackathon Task', year: '2025' },
    { src: winnerTukendraCollageImg, alt: 'Tukendra Golegaonkar receiving the Certificate of Achievement, Winner of AAYODHYAM 2025 Metallurgy Hackathon Task', year: '2025' },
    { src: certificatePranavImg, alt: 'Certificate of Achievement awarded to Pranav Khot, AAYODHYAM 2025', year: '2025' },
];

export default function GalleryPage() {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const close = useCallback(() => setLightboxIndex(null), []);
    const prev = useCallback(
        () => setLightboxIndex((i) => (i === null ? null : (i - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length)),
        []
    );
    const next = useCallback(
        () => setLightboxIndex((i) => (i === null ? null : (i + 1) % GALLERY_IMAGES.length)),
        []
    );

    useEffect(() => {
        if (lightboxIndex === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [lightboxIndex, close, prev, next]);

    return (
        <PageTransition>
            <div className="page-header pt-24 pb-12 relative overflow-hidden">
                <div className="absolute inset-0 lattice-bg opacity-[0.06]" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <span className="section-label text-gold-400 flex items-center gap-2">
                        <Images className="w-4 h-4" /> Gallery
                    </span>
                    <h1 className="text-headline text-white mb-3">Moments from AAYODHYAM</h1>
                    <p className="text-metal-300 text-body-lg max-w-2xl">
                        A look back at previous editions — labs, jury rounds, and the teams who built something new.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {GALLERY_IMAGES.map((img, i) => (
                        <motion.button
                            key={i}
                            {...fadeInUp}
                            transition={{ duration: 0.35, delay: (i % 8) * 0.04 }}
                            onClick={() => setLightboxIndex(i)}
                            className="group relative aspect-square overflow-hidden rounded-xl bg-metal-100 border border-metal-100 focus:outline-none focus:ring-2 focus:ring-gold-400"
                        >
                            <img
                                src={img.src}
                                alt={img.alt}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/40 transition-colors duration-300 flex items-end">
                                <span className="w-full p-2.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate">
                                    {img.alt}
                                </span>
                            </div>
                            <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-navy-950/70 text-gold-300">
                                {img.year}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-navy-950/95 backdrop-blur-sm flex items-center justify-center px-4"
                        onClick={close}
                    >
                        <button
                            onClick={close}
                            aria-label="Close"
                            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                prev();
                            }}
                            aria-label="Previous image"
                            className="absolute left-3 sm:left-6 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                next();
                            }}
                            aria-label="Next image"
                            className="absolute right-3 sm:right-6 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>

                        <motion.div
                            key={lightboxIndex}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="max-w-4xl w-full"
                        >
                            <img
                                src={GALLERY_IMAGES[lightboxIndex].src}
                                alt={GALLERY_IMAGES[lightboxIndex].alt}
                                className="w-full max-h-[75vh] object-contain rounded-lg"
                            />
                            <p className="text-center text-metal-300 text-sm mt-4">
                                {GALLERY_IMAGES[lightboxIndex].alt} · {lightboxIndex + 1} / {GALLERY_IMAGES.length}
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageTransition>
    );
}