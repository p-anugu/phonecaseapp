import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, Image, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type ConversionMethod = 'embed' | 'potrace' | 'autotrace';

export function ImageToSvgConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [method, setMethod] = useState<ConversionMethod>('potrace');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please select a valid image file',
        variant: 'destructive',
      });
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(droppedFile);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please drop a valid image file',
        variant: 'destructive',
      });
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const convertFile = async () => {
    if (!file) return;

    setLoading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('method', method);
      formData.append('outputFormat', 'svg');

      setProgress(30);

      const response = await fetch('/api/convert-image', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      if (!response.ok) {
        throw new Error('Conversion failed');
      }

      const blob = await response.blob();
      setProgress(90);

      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.[^/.]+$/, '.svg');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setProgress(100);

      toast({
        title: 'Success',
        description: 'Image converted to SVG successfully!',
      });

      // Reset
      setFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Conversion error:', error);
      toast({
        title: 'Conversion failed',
        description: error.message || 'An error occurred during conversion',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Image to SVG Converter</CardTitle>
        <CardDescription>
          Convert raster images (PNG, JPG, etc.) to scalable vector graphics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Conversion Method</label>
          <Select value={method} onValueChange={(value) => setMethod(value as ConversionMethod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="potrace">
                Potrace (Best for logos & silhouettes)
              </SelectItem>
              <SelectItem value="autotrace">
                Autotrace (Good for color images)
              </SelectItem>
              <SelectItem value="embed">
                Embed (Keeps raster, wraps in SVG)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {previewUrl ? (
            <div className="space-y-4">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-h-48 mx-auto rounded"
              />
              <p className="text-sm text-gray-600">{file?.name}</p>
              <p className="text-xs text-gray-500">
                {file && (file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Image className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-sm text-gray-600">
                Drag and drop your image here, or click to browse
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload">
                <Button variant="outline" asChild>
                  <span>Choose Image</span>
                </Button>
              </label>
            </div>
          )}
        </div>

        {method === 'potrace' && (
          <div className="bg-blue-50 p-3 rounded text-sm">
            <strong>Potrace:</strong> Best for black & white conversion. Works great with logos, 
            icons, and high-contrast images. Produces clean vector paths.
          </div>
        )}

        {method === 'autotrace' && (
          <div className="bg-green-50 p-3 rounded text-sm">
            <strong>Autotrace:</strong> Preserves colors and works with complex images. 
            Good for converting illustrations and artwork.
          </div>
        )}

        {method === 'embed' && (
          <div className="bg-yellow-50 p-3 rounded text-sm">
            <strong>Embed:</strong> Doesn't actually vectorize. Just wraps the raster image 
            in SVG format. File size will be larger.
          </div>
        )}

        {file && (
          <Button
            onClick={convertFile}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Convert to SVG
              </>
            )}
          </Button>
        )}

        {loading && (
          <Progress value={progress} className="w-full" />
        )}
      </CardContent>
    </Card>
  );
}