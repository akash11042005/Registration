import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Star, Image as ImageIcon } from 'lucide-react';
import PageTransition from '@/components/PageTransition';

const TESTIMONIALS = [
    {
        name: 'Rahul Sharma',
        team: 'FerroTech Innovators, AAYODHYAM 2025',
        quote: 'The problem statements were genuinely industry-relevant. Working with the WCE metallurgy lab equipment for the first time was the highlight of our year.',
        initials: 'RS',
        color: 'from-navy-700 to-navy-900',
    },
    {
        name: 'Sneha Kulkarni',
        team: 'Titanium Squad, AAYODHYAM 2025',
        quote: "Five days of pure grind and it was worth every hour. The jury feedback after our microstructure evaluation pushed us to think like real engineers, not just students.",
        initials: 'SK',
        color: 'from-gold-500 to-gold-700',
    },
    {
        name: 'Amit Deshmukh',
        team: 'Alloy Innovators, AAYODHYAM 2025',
        quote: 'Best-organized hackathon we attended that year — clear rules, fast payment verification, and a dashboard that actually kept us updated on our task status.',
        initials: 'AD',
        color: 'from-emerald-600 to-emerald-800',
    },
    {
        name: 'Priya Patel',
        team: 'Grain Boundary Gang, AAYODHYAM 2025',
        quote: 'As a second-year student, I was intimidated at first. The mentors and organizers made sure every team, regardless of experience, got equal lab time and guidance.',
        initials: 'PP',
        color: 'from-purple-600 to-purple-800',
    },
    {
        name: 'Rohan Joshi',
        team: 'Corrosion Crusaders, AAYODHYAM 2025',
        quote: 'The on-campus stay and WCE facilities made this feel like a proper national-level event, not just a college fest side activity.',
        initials: 'RJ',
        color: 'from-red-600 to-red-800',
    },
    {
        name: 'Neha Kale',
        team: 'Heat Treat Heroes, AAYODHYAM 2025',
        quote: 'Winning our category felt incredible, but honestly the real win was the network of professors and peers we built across five days.',
        initials: 'NK',
        color: 'from-blue-600 to-blue-800',
    },
];

const GALLERY_CAPTIONS = [
    'Opening ceremony, AAYODHYAM 2025',
    'Teams at work in the metallurgy lab',
    'Jury evaluation rounds',
    'Grain size measurement session',
    'Award & closing ceremony',
    'Winning team, AAYODHYAM 2025',
];

export default function TestimonialsPage() {
    return (
        <PageTransition>
            <div className="page-header pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <span className="section-label text-gold-400">AAYODHYAM 2025</span>
                    <h1 className="text-headline text-white mb-2">Testimonials & Gallery</h1>
                    <p className="text-metal-300 text-sm max-w-xl">
                        Hear from teams who took part in last year's edition, and take a look back at how the event came together.
                    </p>
                </div>
            </div>

            {/* Gallery strip (previous year event) */}
            <section className="py-14 bg-metal-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2 mb-6">
                        <ImageIcon className="w-5 h-5 text-navy-900" />
                        <h2 className="text-title text-navy-900 font-bold">Moments from AAYODHYAM 2025</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {GALLERY_CAPTIONS.map((caption, i) => (
                            <motion.div
                                key={caption}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                className="card overflow-hidden group"
                            >
                                <div className="aspect-video bg-gradient-to-br from-navy-800 to-navy-950 flex items-center justify-center relative">
                                    <div className="absolute inset-0 opacity-20" style={{
                                        backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(234,179,8,0.5), transparent 60%)',
                                    }} />
                                    <span className="text-gold-400 font-display font-black text-3xl relative z-10">Aa</span>
                                </div>
                                <div className="p-3">
                                    <p className="text-xs font-semibold text-metal-600">{caption}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <p className="text-xs text-metal-400 mt-4">
                        Full-resolution event photo gallery will be uploaded here by the organizing committee.
                    </p>
                </div>
            </section>

            {/* Testimonial quotes */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2 mb-8">
                        <Quote className="w-5 h-5 text-navy-900" />
                        <h2 className="text-title text-navy-900 font-bold">What Past Participants Say</h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {TESTIMONIALS.map((t, i) => (
                            <motion.div
                                key={t.name}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                className="card p-6 flex flex-col gap-4"
                            >
                                <div className="flex items-center gap-1 text-gold-500">
                                    {Array.from({ length: 5 }).map((_, s) => (
                                        <Star key={s} className="w-3.5 h-3.5 fill-current" />
                                    ))}
                                </div>
                                <p className="text-sm text-metal-700 leading-relaxed flex-1">"{t.quote}"</p>
                                <div className="flex items-center gap-3 pt-3 border-t border-metal-100">
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                        {t.initials}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-navy-900 text-sm">{t.name}</p>
                                        <p className="text-xs text-metal-500">{t.team}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </PageTransition>
    );
}