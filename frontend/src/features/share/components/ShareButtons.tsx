import { Download, Share2 } from 'lucide-react';
import { useImageExport } from '../hooks/useImageExport';
import toast from 'react-hot-toast';

interface Props {
    matchId: string;
    captureElementId: string;
    matchTitle: string;
}

export const ShareButtons = ({ matchId, captureElementId, matchTitle }: Props) => {
    const { exportToImage, isExporting } = useImageExport(captureElementId);

    const shareUrl = `${window.location.origin}/share/${matchId}`;
    const shareText = `Check out this thrilling match: ${matchTitle}! 🏏🔥`;

    const handleShareAction = async (platform: 'whatsapp' | 'twitter' | 'native') => {
        if (platform === 'whatsapp') {
            const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
            window.open(url, '_blank');
        } else if (platform === 'twitter') {
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
            window.open(url, '_blank');
        } else if (platform === 'native') {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'CricScore Match',
                        text: shareText,
                        url: shareUrl
                    });
                } catch (err) {
                    console.log('User cancelled share');
                }
            } else {
                navigator.clipboard.writeText(shareText + ' ' + shareUrl);
                toast.success('Link copied to clipboard!');
            }
        }
    };

    return (
        <div className="flex flex-col gap-3 w-full">
            <button
                onClick={() => exportToImage(`cricscore-${matchId}`)}
                disabled={isExporting}
                className="w-full flex justify-center items-center gap-2 bg-primary text-primary-foreground font-bold py-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
            >
                <Download className="w-5 h-5" />
                {isExporting ? 'Generating Image...' : 'Save Scorecard as Image'}
            </button>

            <div className="flex gap-3">
                <button
                    onClick={() => handleShareAction('whatsapp')}
                    className="flex-1 flex justify-center items-center gap-2 bg-[#25D366] text-white font-bold py-3 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                >
                    WhatsApp
                </button>
                <button
                    onClick={() => handleShareAction('twitter')}
                    className="flex-1 flex justify-center items-center gap-2 bg-[#1DA1F2] text-white font-bold py-3 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                >
                    Twitter / X
                </button>
                <button
                    onClick={() => handleShareAction('native')}
                    className="flex-1 flex justify-center items-center gap-2 bg-secondary text-foreground font-bold py-3 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                    title="Share Link"
                >
                    <Share2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
