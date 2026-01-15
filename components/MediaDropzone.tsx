
import React, { useState, useCallback } from 'react';

interface MediaDropzoneProps {
    onImagesSelected: (images: string[]) => void;
    onClipsSelected: (clips: string[]) => void;
    currentImages: string[];
    currentClips: string[];
}

const MediaDropzone: React.FC<MediaDropzoneProps> = ({
    onImagesSelected,
    onClipsSelected,
    currentImages,
    currentClips
}) => {
    const [isDragging, setIsDragging] = useState(false);

    const processFiles = (files: FileList | File[]) => {
        const newImages: string[] = [];
        const newClips: string[] = [];
        let processedCount = 0;
        const filesToProcess = Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));

        if (filesToProcess.length === 0) return;

        filesToProcess.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result as string;
                if (file.type.startsWith('image/')) {
                    newImages.push(data);
                } else {
                    newClips.push(data);
                }

                processedCount++;
                if (processedCount === filesToProcess.length) {
                    if (newImages.length > 0) onImagesSelected([...currentImages, ...newImages]);
                    if (newClips.length > 0) onClipsSelected([...currentClips, ...newClips]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
    };

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = Array.from(e.clipboardData.items);
        const files = items.map(i => i.getAsFile()).filter(f => f !== null) as File[];
        if (files.length > 0) processFiles(files);
    }, [currentImages, currentClips, onImagesSelected, onClipsSelected]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) processFiles(e.target.files);
    };

    const removeImage = (index: number) => {
        const next = [...currentImages];
        next.splice(index, 1);
        onImagesSelected(next);
    };

    const removeClip = (index: number) => {
        const next = [...currentClips];
        next.splice(index, 1);
        onClipsSelected(next);
    };

    return (
        <div className="space-y-4">
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onPaste={handlePaste}
                className={`relative group h-32 border-2 border-dashed rounded-2xl transition-all overflow-hidden flex flex-col items-center justify-center cursor-pointer ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'
                    }`}
            >
                <div className="flex gap-4 mb-2">
                    <svg className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <svg className="w-8 h-8 text-slate-500 group-hover:text-pink-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </div>
                <p className="text-xs text-slate-400 font-medium tracking-tight">Drop or paste <span className="text-indigo-400">images</span> & <span className="text-pink-400">clips</span></p>
                <p className="text-[9px] text-slate-600 mt-1 uppercase font-black">Multimodal context enabled</p>
                <input
                    type="file"
                    multiple
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    accept="image/*,video/*"
                />
            </div>

            {(currentImages.length > 0 || currentClips.length > 0) && (
                <div className="grid grid-cols-4 gap-2">
                    {currentImages.map((img, idx) => (
                        <div key={`img-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 group bg-slate-900 shadow-xl">
                            <img src={img} className="w-full h-full object-cover" />
                            <div className="absolute top-1 left-1 bg-indigo-500 text-[8px] px-1 rounded font-bold uppercase tracking-wider text-white">IMG</div>
                            <button
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                    {currentClips.map((clip, idx) => (
                        <div key={`clip-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 group bg-slate-900 shadow-xl">
                            <video src={clip} className="w-full h-full object-cover" autoPlay muted loop />
                            <div className="absolute top-1 left-1 bg-pink-500 text-[8px] px-1 rounded font-bold uppercase tracking-wider text-white">CLIP</div>
                            <button
                                onClick={() => removeClip(idx)}
                                className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MediaDropzone;
