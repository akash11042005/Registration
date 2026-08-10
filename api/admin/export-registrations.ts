// ============================================================
// GET /api/admin/export-registrations?format=csv|xlsx|pdf
//
// Single admin-only export endpoint backing the dashboard's Export
// menu. Reads the full registrations list from Firestore once (via
// the Admin SDK) and generates whichever file format was requested,
// entirely server-side, then streams it back as a download.
//
// Admin-only: verifies the caller's Firebase ID token and checks
// their email against ADMIN_EMAILS (mirrors the same check
// src/contexts/AuthContext.tsx does client-side for `isAdmin`).
// ============================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { getAdminDb } from '../_lib/firebaseadmin.js';
import { getVerifiedCaller } from '../_lib/verifyAuth.js';

const ADMIN_EMAILS = [
    'aayodhyam@walchandsangli.ac.in',
    'admin@aayodhyam2026.in',
    // Keep in sync with src/lib/constants.ts ADMIN_EMAILS
];

interface RegistrationRecord {
    registrationId?: string;
    teamName?: string;
    leaderName?: string;
    leaderEmail?: string;
    leaderPhone?: string;
    collegeName?: string;
    leaderYear?: string;
    leaderBranch?: string;
    member1Name?: string;
    member1Year?: string;
    member1Branch?: string;
    member2Name?: string;
    member2Year?: string;
    member2Branch?: string;
    taskId?: number;
    taskTitle?: string;
    wantsHomeDelivery?: boolean;
    totalFee?: number;
    transactionId?: string;
    paymentStatus?: string;
    createdAt?: string;
}

// Full field set used by the CSV and Excel exports.
function toFullRow(r: RegistrationRecord) {
    return {
        'Registration ID': r.registrationId || '',
        'Team Name': r.teamName || '',
        "Leader's Name": r.leaderName || '',
        'Leader Year of Study': r.leaderYear || '',
        'Leader Branch': r.leaderBranch || '',
        'Leader Email': r.leaderEmail || '',
        'Leader Phone': r.leaderPhone || '',
        'College Name': r.collegeName || '',
        'Member 1': r.member1Name || '',
        'Member 1 Year of Study': r.member1Year || '',
        'Member 1 Branch': r.member1Branch || '',
        'Member 2': r.member2Name || '',
        'Member 2 Year of Study': r.member2Year || '',
        'Member 2 Branch': r.member2Branch || '',
        'Problem Statement ID': r.taskId ?? '',
        'Problem Statement Chosen': r.taskTitle || '',
        'Wants Home Delivery': r.wantsHomeDelivery ? 'Yes' : 'No',
        'Total Fee (₹)': r.totalFee ?? '',
        'Razorpay Payment ID': r.transactionId || '',
        'Payment Status': r.paymentStatus || '',
        'Registered At': r.createdAt || '',
    };
}

function buildCsv(regs: RegistrationRecord[]): string {
    const rows = regs.map(toFullRow);
    const headers = Object.keys(rows[0] || toFullRow({}));
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape((row as Record<string, unknown>)[h])).join(','))];
    return lines.join('\n');
}

function buildXlsx(regs: RegistrationRecord[]): Buffer {
    const rows = regs.map(toFullRow);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    // Reasonable column widths so the sheet is readable without the admin
    // having to manually resize every column after opening it. Order and
    // count must match toFullRow's keys above exactly (21 columns).
    worksheet['!cols'] = [
        { wch: 16 }, // Registration ID
        { wch: 22 }, // Team Name
        { wch: 20 }, // Leader's Name
        { wch: 14 }, // Leader Year of Study
        { wch: 26 }, // Leader Branch
        { wch: 28 }, // Leader Email
        { wch: 14 }, // Leader Phone
        { wch: 26 }, // College Name
        { wch: 18 }, // Member 1
        { wch: 14 }, // Member 1 Year of Study
        { wch: 26 }, // Member 1 Branch
        { wch: 18 }, // Member 2
        { wch: 14 }, // Member 2 Year of Study
        { wch: 26 }, // Member 2 Branch
        { wch: 8 },  // Problem Statement ID
        { wch: 38 }, // Problem Statement Chosen
        { wch: 12 }, // Wants Home Delivery
        { wch: 12 }, // Total Fee
        { wch: 22 }, // Razorpay Payment ID
        { wch: 14 }, // Payment Status
        { wch: 22 }, // Registered At
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// PDF export deliberately uses a smaller, print-friendly column set (not
// all 21 fields from the CSV/Excel exports) — a landscape table with every
// field would run off the page width and be unreadable. This covers the
// core "who, what year/branch, what task, paid or not" summary a printed/
// shared report actually needs. Only the leader's year and branch are
// shown here (not member details) to keep the row readable — the full
// breakdown is in CSV/Excel.
const PDF_COLUMNS: { label: string; width: number; get: (r: RegistrationRecord) => string }[] = [
    { label: 'Reg ID', width: 60, get: (r) => r.registrationId || '' },
    { label: 'Team Name', width: 80, get: (r) => r.teamName || '' },
    { label: "Leader's Name", width: 80, get: (r) => r.leaderName || '' },
    { label: 'Year', width: 40, get: (r) => r.leaderYear || '' },
    { label: 'Branch', width: 90, get: (r) => r.leaderBranch || '' },
    { label: 'Phone', width: 60, get: (r) => r.leaderPhone || '' },
    { label: 'College', width: 95, get: (r) => r.collegeName || '' },
    { label: 'Problem Statement', width: 115, get: (r) => (r.taskId ? `#${r.taskId} ${r.taskTitle || ''}` : r.taskTitle || '') },
    { label: 'Status', width: 50, get: (r) => r.paymentStatus || '' },
];

function buildPdf(regs: RegistrationRecord[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageLeft = doc.page.margins.left;
        const pageRight = doc.page.width - doc.page.margins.right;
        const rowHeight = 20;
        const headerFontSize = 8;
        const cellFontSize = 7.5;

        doc.fontSize(16).font('Helvetica-Bold').text('AAYODHYAM 2026 — Registered Teams', pageLeft, 30);
        doc.fontSize(9).font('Helvetica').fillColor('#555').text(
            `Generated ${new Date().toLocaleString('en-IN')} · ${regs.length} team${regs.length === 1 ? '' : 's'}`,
            pageLeft,
            52
        );
        doc.fillColor('#000');

        let y = 80;

        const drawHeaderRow = () => {
            doc.font('Helvetica-Bold').fontSize(headerFontSize);
            let x = pageLeft;
            for (const col of PDF_COLUMNS) {
                doc.text(col.label, x + 2, y + 5, { width: col.width - 4, ellipsis: true });
                x += col.width;
            }
            doc.moveTo(pageLeft, y + rowHeight).lineTo(pageRight, y + rowHeight).strokeColor('#999').stroke();
            y += rowHeight;
        };

        drawHeaderRow();
        doc.font('Helvetica').fontSize(cellFontSize);

        regs.forEach((r, i) => {
            if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
                doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
                y = 30;
                drawHeaderRow();
                doc.font('Helvetica').fontSize(cellFontSize);
            }

            if (i % 2 === 1) {
                doc.rect(pageLeft, y, pageRight - pageLeft, rowHeight).fillColor('#f5f5f5').fill();
                doc.fillColor('#000');
            }

            let x = pageLeft;
            for (const col of PDF_COLUMNS) {
                doc.text(col.get(r), x + 2, y + 5, { width: col.width - 4, ellipsis: true });
                x += col.width;
            }
            y += rowHeight;
        });

        doc.end();
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const format = (Array.isArray(req.query.format) ? req.query.format[0] : req.query.format) || 'xlsx';
    if (!['csv', 'xlsx', 'pdf'].includes(format)) {
        return res.status(400).json({ error: "Invalid format — expected 'csv', 'xlsx', or 'pdf'." });
    }

    const caller = await getVerifiedCaller(req);
    if (!caller) {
        return res.status(401).json({ error: 'Missing or invalid authentication token. Please sign in again.' });
    }
    if (!caller.email || !ADMIN_EMAILS.includes(caller.email.toLowerCase())) {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    try {
        const db = getAdminDb();
        const snap = await db.collection('registrations').orderBy('createdAt', 'desc').get();
        const regs = snap.docs.map((d) => d.data() as RegistrationRecord);
        const dateStamp = new Date().toISOString().slice(0, 10);

        if (format === 'csv') {
            const csv = buildCsv(regs);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="AAYODHYAM_Registrations_${dateStamp}.csv"`);
            return res.status(200).send(csv);
        }

        if (format === 'xlsx') {
            const buffer = buildXlsx(regs);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="AAYODHYAM_Registrations_${dateStamp}.xlsx"`);
            return res.status(200).send(buffer);
        }

        // pdf
        const buffer = await buildPdf(regs);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="AAYODHYAM_Registrations_${dateStamp}.pdf"`);
        return res.status(200).send(buffer);
    } catch (err) {
        console.error('Export failed:', err);
        return res.status(500).json({ error: 'Failed to generate the export. Please try again.' });
    }
}