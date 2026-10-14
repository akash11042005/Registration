import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
const fadeInUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.4 },
};

// ------------------------------------------------------------------
// HOW TO ADD PHOTOS: just drop image files (.jpg .jpeg .png .webp) into
// src/assets/gallery/ — they appear automatically, 8 per page.
// Caption defaults to the file name (e.g. "team-photo.jpeg" -> "Team photo").
// Optional: add a nicer caption below in CAPTIONS (key = exact file name).
// New photos show after the ones listed in ORDER, sorted by file name.
// ------------------------------------------------------------------
const GALLERY_YEAR = '2026';
const PER_PAGE = 8;

const CAPTIONS: Record<string, string> = {
    '2026-01-inauguration-guest-speaker.jpeg': 'College Professor addressing participants at the AAYODHYAM 2026 inauguration',
    '2026-02-inauguration-felicitation-bouquet.jpeg': 'Felicitation of the guest with a bouquet at the inauguration',
    '2026-03-inauguration-felicitation-volunteer.jpeg': 'Volunteers assisting with the felicitation as guests look on',
    '2026-04-inauguration-audience-auditorium.jpeg': 'Participants, faculty and guests gathered in the auditorium for the inauguration',
    '2026-05-participants-group-photo-mechanical-dept.jpeg': 'Organizing team and volunteers outside the Department of Mechanical Engineering, WCE Sangli',
    '2026-06-team-presentation-lab-jury.jpeg': 'A team presenting its Innovation, Feasibility & Future Scope to the jury in the lab',
    '2026-07-registration-desk-lab.jpeg': 'Volunteers coordinating at the desk while teams prepare in the lab',
    '2026-08-team-presentation-classroom.jpeg': 'Team presenting its process sequence and parameters to the jury',
    '2026-09-participants-attentive-audience.jpeg': 'Participants following a team presentation attentively',
    '2026-10-team-presentation-microscopic-examination.jpeg': 'Team presenting microscopic examination and depth measurement results',
    '2026-11-jury-members-evaluating.jpeg': 'Jury members reviewing and scoring team submissions',
    '2026-12-team-presentation-heat-transfer-lab.jpeg': 'Team presenting its solution to the jury in the lab',
    '2026-13-organizer-addressing-gathering-podium.jpeg': 'Student organizer addressing the gathering from the podium',
    '2026-14-winners-trophy-team-a.jpeg': 'Winning team receiving the trophy and certificates at AAYODHYAM 2026',
    '2026-15-winners-trophy-team-b.jpeg': 'Winning team with the trophy and certificates, AAYODHYAM 2026',
    '2026-16-winners-trophy-team-c.jpeg': 'Winners of AAYODHYAM 2026 receiving their trophy and certificates on stage',
    '2026-17-winners-trophy-team-d.jpeg': 'Winning team of three receiving the trophy and certificates, AAYODHYAM 2026',
    '2026-18-winners-trophy-team-e.jpeg': 'Winning duo receiving the trophy and certificates, AAYODHYAM 2026',
    '2026-19-winners-trophy-team-f.jpeg': 'Winning team receiving the trophy and certificates from the guests',
    '2026-20-participants-faculty-group-photo.jpeg': 'Participants with the faculty coordinator after the event',
    '2026-21-stage-group-trophy-participation-certificates.jpeg': 'Participants and organizers on stage with the winning trophy and certificates of participation',
    '2026-22-stage-group-participants-organizers.jpeg': 'Participants and organizing team together on stage',
    '2026-23-certificate-of-organization-saloni-birje.jpeg': 'Certificate of Organization presented to core organizer Saloni Birje',
    '2026-24-certificate-of-organization-parth-jadhav.jpeg': 'Certificate of Organization presented to core organizer Parth Jadhav',
    '2026-25-certificate-of-organization-varun-mahajan.jpeg': 'Certificate of Organization presented to core organizer Varun Mahajan',
    '2026-26-certificate-of-organization-nishant-tone.jpeg': 'Certificate of Organization presented to core organizer Nishant Tone',
    '2026-27-certificate-of-organization-hrishikesh-bangude.jpeg': 'Certificate of Organization presented to core organizer Hrishikesh Bangude',
    '2026-28-certificate-of-volunteering-1.jpeg': 'Certificate of Volunteering presented to a volunteer of AAYODHYAM 2026',
    '2026-29-certificate-of-volunteering-2.jpeg': 'Certificate of Volunteering presented to a volunteer of AAYODHYAM 2026',
    'inauguration-lamp-lighting.jpeg': 'Inauguration lamp-lighting ceremony, Department of Mechanical Engineering, Walchand College of Engineering, Sangli',
    'inauguration-felicitation.jpeg': 'Felicitation of guests at the inauguration ceremony',
    'inauguration-group-certificates.jpeg': 'Winning teams and organizers with certificates, AAYODHYAM 2025',
    'winner-pranav-khot-collage.jpeg': 'Pranav Khot receiving the Certificate of Achievement, Winner of AAYODHYAM 2025 Metallurgy Hackathon Task',
    'winner-tukendra-golegaonkar-collage.jpeg': 'Tukendra Golegaonkar receiving the Certificate of Achievement, Winner of AAYODHYAM 2025 Metallurgy Hackathon Task',
    'certificate-pranav-khot.jpeg': 'Certificate of Achievement awarded to Pranav Khot, AAYODHYAM 2025',
};

// Files listed here come first, in this order. Everything else follows alphabetically.
const ORDER = Object.keys(CAPTIONS);

interface GalleryImage {
    src: string;
    alt: string;
    year: string;
}

const modules = import.meta.glob('/src/assets/gallery/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
    eager: true,
    query: '?url',
    import: 'default',
}) as Record<string, string>;

const prettify = (file: string) => {
    const base = file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    return base.charAt(0).toUpperCase() + base.slice(1);
};

const GALLERY_IMAGES: GalleryImage[] = Object.entries(modules)
    .map(([path, src]) => ({ file: path.split('/').pop() as string, src }))
    .sort((a, b) => {
        const ia = ORDER.indexOf(a.file);
        const ib = ORDER.indexOf(b.file);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        return a.file.localeCompare(b.file, undefined, { numeric: true });
    })
    .map(({ file, src }) => ({ src, alt: CAPTIONS[file] ?? prettify(file), year: GALLERY_YEAR }));

export default function GalleryPage() {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(GALLERY_IMAGES.length / PER_PAGE));
    const start = (page - 1) * PER_PAGE;
    const pageImages = GALLERY_IMAGES.slice(start, start + PER_PAGE);
    const goToPage = (n: number) => {
        setPage(n);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
                    {pageImages.map((img, idx) => {
                        const i = start + idx;
                        return (
                            <motion.button
                                key={i}
                                {...fadeInUp}
                                transition={{ duration: 0.35, delay: idx * 0.04 }}
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
                        );
                    })}
                </div>

                {totalPages > 1 && (
                    <nav aria-label="Gallery pages" className="mt-10 flex flex-wrap items-center justify-center gap-2">
                        <button
                            onClick={() => goToPage(page - 1)}
                            disabled={page === 1}
                            className="px-3 py-2 rounded-lg border border-metal-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-metal-100 transition-colors"
                        >
                            Prev
                        </button>
                        {Array.from({ length: totalPages }, (_, n) => n + 1).map((n) => (
                            <button
                                key={n}
                                onClick={() => goToPage(n)}
                                aria-current={n === page ? 'page' : undefined}
                                className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${n === page
                                    ? 'bg-navy-950 text-gold-300'
                                    : 'border border-metal-200 hover:bg-metal-100'
                                    }`}
                            >
                                {n}
                            </button>
                        ))}
                        <button
                            onClick={() => goToPage(page + 1)}
                            disabled={page === totalPages}
                            className="px-3 py-2 rounded-lg border border-metal-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-metal-100 transition-colors"
                        >
                            Next
                        </button>
                    </nav>
                )}
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