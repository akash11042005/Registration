// ============================================================
// Registration receipt — client-side PDF generation via jsPDF.
// Kept intentionally simple (text + lines, no external assets)
// so it never depends on network access to render.
// ============================================================
import { jsPDF } from 'jspdf';
import { Registration } from '@/lib/types';
import { ORG } from '@/lib/constants';

export function downloadRegistrationReceipt(reg: Registration) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginX = 48;
    let y = 56;

    const line = (h = 18) => {
        y += h;
    };
    const heading = (text: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(text, marginX, y);
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, y + 4, 547, y + 4);
        line(24);
    };
    const row = (label: string, value: string) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139);
        doc.text(label, marginX, y);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(value || '—', marginX + 160, y);
        line(18);
    };

    // Title block
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 595, 70, 'F');
    doc.setTextColor(250, 204, 21);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('AAYODHYAM 2026', marginX, 42);
    doc.setFontSize(9);
    doc.setTextColor(226, 232, 240);
    doc.text('Official Team Registration Receipt', marginX, 58);
    y = 100;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Registration ID: ${reg.registrationId}`, marginX, y);
    doc.text(`Date: ${new Date(reg.createdAt).toLocaleDateString('en-IN')}`, 400, y);
    line(28);

    heading('Team');
    row('Team Name', reg.teamName);
    row('College Name', reg.collegeName);
    row('Leader Name', reg.leaderName);
    row('Leader Email', reg.leaderEmail);
    row('Leader Contact', reg.leaderPhone);
    line(6);

    heading('Team Members');
    if (reg.member1Name) row('Member 1', reg.member1Name);
    if (reg.member2Name) row('Member 2', reg.member2Name);
    line(6);

    heading('Mentor');
    row('Mentor Name', reg.mentorName);
    if (reg.mentorEmail) row('Mentor Email', reg.mentorEmail);
    if (reg.mentorPhone) row('Mentor Contact', reg.mentorPhone);
    line(6);

    heading('Problem Statement');
    row('Task', `#${reg.taskId}: ${reg.taskTitle}`);
    line(6);

    heading('Payment');
    row('Payment Status', reg.paymentStatus.toUpperCase());
    row('Amount Paid', `Rs. ${reg.totalFee ?? '—'}`);
    row('Razorpay Payment ID', reg.transactionId);
    if (reg.wantsHomeDelivery) row('Add-on', 'Raw Material Home Delivery');
    line(20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
        `${ORG.name}, ${ORG.college} — ${ORG.location}`,
        marginX,
        780
    );
    doc.text('This is a system-generated receipt and does not require a signature.', marginX, 792);

    doc.save(`AAYODHYAM_Receipt_${reg.registrationId}.pdf`);
}