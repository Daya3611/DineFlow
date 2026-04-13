"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud, X, Loader2, ImagePlus } from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  folder: string;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, folder, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/)) {
      toast.error("Invalid file type. Only JPG, PNG, WEBP are allowed.");
      return;
    }
    
    // 2MB limit
    if (file.size > 2 * 1024 * 1024) {
       toast.error("File size exceeds 2MB limit.");
       return;
    }

    setIsUploading(true);
    setProgress(0);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      toast.error("Cloudinary Cloud Name is missing in environment variables.");
      setIsUploading(false);
      return;
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    // MVP Instruction: "unsigned" preset named "products"
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "products");
    formData.append("folder", folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        setProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        onChange(response.secure_url);
        toast.success("Image uploaded successfully!");
      } else {
        const error = JSON.parse(xhr.responseText);
        toast.error(`Upload failed: ${error.error?.message || "Unknown error"}`);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      toast.error("Network error during upload.");
    };

    xhr.send(formData);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled || isUploading) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  }, [disabled, isUploading, folder]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isUploading) return;
    
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  if (value) {
    return (
      <div className="relative h-44 w-full sm:w-64 rounded-2xl border-2 border-emerald-100 overflow-hidden group shadow-sm">
         <img src={value} alt="Upload" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {!disabled && (
              <Button type="button" className="/90 hover: text-red-600 .5 transform" onClick={(e) => { e.stopPropagation(); onChange(""); }}
                title="Remove image"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
         </div>
         <div className="absolute bottom-2 left-2 right-2 flex justify-between px-2">
            <span className="text-[10px] bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full text-white font-bold tracking-wider">ATTACHED</span>
         </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-44 w-full sm:w-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden cursor-pointer shadow-sm group",
        dragActive ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50 bg-gray-50/50",
        (disabled || isUploading) && "opacity-60 cursor-not-allowed grayscale"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => { if (!disabled && !isUploading) fileInputRef.current?.click(); }}
    >
       <input 
         ref={fileInputRef} 
         type="file" 
         accept="image/jpeg,image/png,image/webp" 
         className="hidden" 
         onChange={onFileChange} 
         disabled={disabled || isUploading}
       />
       
       {isUploading ? (
         <div className="flex flex-col items-center justify-center w-full px-6 text-emerald-600">
           <Loader2 className="h-8 w-8 animate-spin mb-3 text-emerald-500" />
           <div className="font-bold text-sm mb-3 text-emerald-700">Uploading {progress}%</div>
           <div className="w-full flex-1 bg-emerald-100 rounded-full h-2 overflow-hidden shadow-inner">
             <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300 shadow-sm" style={{ width: `${progress}%` }} />
           </div>
         </div>
       ) : (
         <div className="flex flex-col items-center justify-center text-gray-500 px-4 text-center">
           <div className="h-12 w-12 rounded-full bg-white text-emerald-600 flex items-center justify-center mb-3 shadow-sm border border-emerald-50 group-hover:scale-110 transition-transform">
             <UploadCloud className="h-6 w-6" />
           </div>
           <div className="font-bold text-sm text-gray-700 mb-1 group-hover:text-emerald-700 transition-colors">Click or Drag & Drop</div>
           <div className="text-[10px] text-gray-400 font-medium">JPG, PNG or WEBP (max. 2MB)</div>
         </div>
       )}
    </div>
  );
}
