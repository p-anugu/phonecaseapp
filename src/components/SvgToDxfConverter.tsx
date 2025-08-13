import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, FileX, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ConversionResult {
  id: string;
  original_filename: string;
  converted_filename: string;
  created_at: string;
  download_url: string;
}

export function SvgToDxfConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [conversionHistory, setConversionHistory] = useState<ConversionResult[]>([]);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'image/svg+xml') {
      setFile(selectedFile);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please select a valid SVG file',
        variant: 'destructive',
      });
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'image/svg+xml') {
      setFile(droppedFile);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please drop a valid SVG file',
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
      // Upload SVG to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `svg-uploads/${fileName}`;

      setProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('conversions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setProgress(50);

      // Call Supabase Edge Function for conversion
      const { data, error } = await supabase.functions.invoke('convert-svg-to-dxf', {
        body: { filePath, fileName: file.name }
      });

      if (error) throw error;

      setProgress(80);

      // Store conversion record in database
      const { data: conversionRecord, error: dbError } = await supabase
        .from('conversions')
        .insert({
          original_filename: file.name,
          converted_filename: data.convertedFileName,
          svg_path: filePath,
          dxf_path: data.dxfPath,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setProgress(100);

      // Get download URL
      const { data: urlData } = supabase.storage
        .from('conversions')
        .getPublicUrl(data.dxfPath);

      // Update history
      setConversionHistory(prev => [{
        id: conversionRecord.id,
        original_filename: file.name,
        converted_filename: data.convertedFileName,
        created_at: conversionRecord.created_at,
        download_url: urlData.publicUrl
      }, ...prev]);

      // Trigger download
      const link = document.createElement('a');
      link.href = urlData.publicUrl;
      link.download = data.convertedFileName;
      link.click();

      toast({
        title: 'Success',
        description: 'File converted successfully!',
      });

      setFile(null);
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
        <CardTitle>SVG to DXF Converter</CardTitle>
        <CardDescription>
          Convert your SVG files to DXF format for CAD applications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {file ? (
            <div className="space-y-2">
              <FileX className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-sm text-gray-600">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-sm text-gray-600">
                Drag and drop your SVG file here, or click to browse
              </p>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>
          )}
        </div>

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
                Convert to DXF
              </>
            )}
          </Button>
        )}

        {loading && (
          <Progress value={progress} className="w-full" />
        )}

        {conversionHistory.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Recent Conversions</h3>
            <div className="space-y-1">
              {conversionHistory.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                >
                  <span className="truncate flex-1">{item.original_filename}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = item.download_url;
                      link.download = item.converted_filename;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}