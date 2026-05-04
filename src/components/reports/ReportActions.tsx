'use client';

import { useState } from 'react';
import { Share2, Download, Check, Loader2 } from 'lucide-react';

export function ReportActions() {
    const [copied, setCopied] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState('');

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        setExportProgress('Preparing...');

        try {
            const html2canvasModule = await import('html2canvas');
            const html2canvas = html2canvasModule.default;
            const jsPDFModule = await import('jspdf');
            const { jsPDF } = jsPDFModule;

            // Target just the report content area
            const element = document.querySelector('.report-container') as HTMLElement;
            if (!element) throw new Error('Report container not found');

            // Temporarily remove overflow / max-height from scrollable children
            // so html2canvas captures the full content
            const scrollables: { el: HTMLElement; overflow: string; maxHeight: string }[] = [];
            element.querySelectorAll<HTMLElement>('*').forEach(el => {
                const style = getComputedStyle(el);
                if (style.overflow !== 'visible' || style.maxHeight !== 'none') {
                    scrollables.push({ el, overflow: el.style.overflow, maxHeight: el.style.maxHeight });
                    el.style.overflow = 'visible';
                    el.style.maxHeight = 'none';
                }
            });

            await new Promise(r => setTimeout(r, 200)); // Let layout repaint

            setExportProgress('Screenshotting...');

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#050505',
                logging: false,
                width: element.scrollWidth,
                height: element.scrollHeight,
                windowWidth: 1280,
                scrollX: 0,
                scrollY: -window.scrollY,
                onclone: (clonedDoc: Document, cloned: HTMLElement) => {
                    // ── Step 1: Patch stylesheets FIRST (html2canvas reads these early)
                    // Replace any lab()/oklch()/lch() color function with a safe rgb fallback
                    const unsupportedColor = /\b(lab|oklch|lch|oklab|color)\s*\([^)]*\)/g;
                    clonedDoc.querySelectorAll('style').forEach(styleEl => {
                        if (styleEl.textContent) {
                            styleEl.textContent = styleEl.textContent.replace(unsupportedColor, 'rgb(100,100,100)');
                        }
                    });

                    // ── Step 2: Layout resets
                    cloned.style.overflow = 'visible';
                    cloned.style.height = 'auto';
                    cloned.querySelectorAll<HTMLElement>('.no-print').forEach(el => el.style.display = 'none');
                    cloned.querySelectorAll<HTMLElement>('*').forEach(el => {
                        el.style.overflow = 'visible';
                        el.style.maxHeight = 'none';
                    });

                    // ── Step 3: Force computed colors inline so no stylesheet parsing needed
                    const win = clonedDoc.defaultView;
                    if (!win) return;
                    const COLOR_PROPS = [
                        'color', 'background-color',
                        'border-top-color', 'border-right-color',
                        'border-bottom-color', 'border-left-color',
                    ];
                    cloned.querySelectorAll('*').forEach(node => {
                        const el = node as HTMLElement;
                        try {
                            const computed = win.getComputedStyle(el);
                            COLOR_PROPS.forEach(prop => {
                                const val = computed.getPropertyValue(prop);
                                if (val) el.style.setProperty(prop, val, 'important');
                            });
                        } catch (_) { }
                    });
                },
            });

            // Restore scrollables
            scrollables.forEach(({ el, overflow, maxHeight }) => {
                el.style.overflow = overflow;
                el.style.maxHeight = maxHeight;
            });

            setExportProgress('Building PDF...');

            const imgData = canvas.toDataURL('image/jpeg', 0.92);

            // A4 in mm
            const A4_W = 210;
            const A4_H = 297;
            // px per mm at 96 dpi
            const PX_PER_MM = 96 / 25.4;

            // Logical size of canvas (captured at 2× so divide by 2)
            const logW = canvas.width / 2;
            const logH = canvas.height / 2;

            // Scale so image fills A4 width
            const imgWidthMM = A4_W;
            const imgHeightMM = (logH / logW) * A4_W;

            const totalPages = Math.ceil(imgHeightMM / A4_H);

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            for (let i = 0; i < totalPages; i++) {
                if (i > 0) pdf.addPage('a4', 'portrait');

                // Offset in mm for this page within the image
                const yOffsetMM = i * A4_H;
                // In image pixels (canvas 2× scale)
                const yOffsetPx = (yOffsetMM / imgHeightMM) * canvas.height;
                const pageHeightPx = Math.min((A4_H / imgHeightMM) * canvas.height, canvas.height - yOffsetPx);

                if (pageHeightPx <= 0) break;

                // Slice the canvas for this page
                const slice = document.createElement('canvas');
                slice.width = canvas.width;
                slice.height = pageHeightPx;
                const ctx = slice.getContext('2d')!;
                ctx.fillStyle = '#050505';
                ctx.fillRect(0, 0, slice.width, slice.height);
                ctx.drawImage(canvas, 0, yOffsetPx, canvas.width, pageHeightPx, 0, 0, canvas.width, pageHeightPx);

                const sliceData = slice.toDataURL('image/jpeg', 0.92);
                const sliceHeightMM = (pageHeightPx / canvas.height) * imgHeightMM;

                pdf.addImage(sliceData, 'JPEG', 0, 0, A4_W, sliceHeightMM);
            }

            setExportProgress('Saving...');
            pdf.save(`specter-report-${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (err: any) {
            console.error('PDF Export failed:', err?.message || err);
        } finally {
            setIsExporting(false);
            setExportProgress('');
        }
    };

    return (
        <div className="flex items-center gap-2 no-print">
            <button
                onClick={handleShare}
                className="flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-white/5 px-6 text-xs font-bold text-black hover:bg-white/10 transition-all active:scale-95 min-w-[100px] justify-center"
            >
                {copied ? (
                    <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                    </>
                ) : (
                    <>
                        <Share2 className="h-4 w-4" /> Share
                    </>
                )}
            </button>
            {/* <button
                disabled={isExporting}
                onClick={handleExport}
                className="flex h-11 items-center gap-2 rounded-xl bg-white px-6 text-xs font-black uppercase tracking-widest text-black hover:bg-slate-200 transition-all active:scale-95 shadow-xl shadow-white/5 min-w-[160px] justify-center disabled:opacity-50"
            >
                {isExporting ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                        <span className="truncate max-w-[100px]">{exportProgress}</span>
                    </>
                ) : (
                    <>
                        <Download className="h-4 w-4" /> Export PDF
                    </>
                )}
            </button> */}
        </div>
    );
}
