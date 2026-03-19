import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';

export const useImageExport = (elementId: string) => {
    const [isExporting, setIsExporting] = useState(false);

    const exportToImage = useCallback(async (fileName: string = 'cricscore-match') => {
        setIsExporting(true);
        try {
            const element = document.getElementById(elementId);
            if (!element) throw new Error('Element not found');

            // Save original styles that might interfere with html2canvas
            const originalStyle = element.style.cssText;
            
            // Temporary styles specifically for the canvas capture
            // ensuring we render at a high enough scale and bypass some transform issues
            element.style.transform = 'none';

            const canvas = await html2canvas(element, {
                scale: 2, // High resolution
                useCORS: true, // Allow cross-origin images (like external logos)
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById(elementId);
                    if (clonedElement) {
                         clonedElement.style.borderRadius = '0';
                         clonedElement.style.boxShadow = 'none';
                         // Add a watermark
                         const watermark = clonedDoc.createElement('div');
                         watermark.innerHTML = 'Generated via CricScore App';
                         watermark.style.position = 'absolute';
                         watermark.style.bottom = '10px';
                         watermark.style.right = '10px';
                         watermark.style.fontSize = '12px';
                         watermark.style.color = 'rgba(0,0,0,0.5)';
                         watermark.style.fontWeight = 'bold';
                         clonedElement.appendChild(watermark);
                    }
                }
            });

            // Restore original styles
            element.style.cssText = originalStyle;

            const image = canvas.toDataURL('image/png');
            
            // Create a temporary link element to trigger the download
            const link = document.createElement('a');
            link.href = image;
            link.download = `${fileName}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            return true;
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        } finally {
            setIsExporting(false);
        }
    }, [elementId]);

    return { exportToImage, isExporting };
};
