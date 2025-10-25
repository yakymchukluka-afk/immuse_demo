"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FloorplanEditor } from "@/components/FloorplanEditor";
import { MobilePreview } from "@/components/MobilePreview";
import { uk } from "@/locales/uk";

interface MuseumData {
  name: string;
  website: string;
  description: string;
}

interface ArchiveFile {
  id: string;
  filename: string;
  status: string;
}

interface TourPreview {
  museumName: string;
  tourContent: string;
  level: string;
  minutes: number;
  interests: string[];
}

export function MuseumWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [museumId, setMuseumId] = useState<string | null>(null);
  const [museumData, setMuseumData] = useState<MuseumData>({
    name: "",
    website: "",
    description: ""
  });
  const [availableMuseums, setAvailableMuseums] = useState<string[]>([]);
  const [archives, setArchives] = useState<ArchiveFile[]>([]);
  const [ingestStatus, setIngestStatus] = useState<string>("");
  const [ingestProgress, setIngestProgress] = useState(0);
  const [tourPreview, setTourPreview] = useState<TourPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedback, setFeedback] = useState<string>('');
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [floorplanTab, setFloorplanTab] = useState<'upload' | 'create'>('upload');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const interests = [
    uk.economics, uk.politics, uk.science, uk.space, 
    uk.art, uk.archaeology, uk.technology, uk.military
  ];

  const timeOptions = [
    { value: 30, label: uk.minutes30 },
    { value: 60, label: uk.minutes60 },
    { value: 90, label: uk.minutes90 },
    { value: 120, label: uk.minutes120 }
  ];

  const levels = [
    { value: uk.children, label: uk.children },
    { value: uk.adults, label: uk.adults },
    { value: uk.professionals, label: uk.professionals }
  ];

  // Load available museums on component mount
  useEffect(() => {
    const loadMuseums = async () => {
      try {
        const response = await fetch("/api/museums/list");
        const museums = await response.json();
        setAvailableMuseums(museums);
      } catch (error) {
        console.error("Failed to load museums:", error);
      }
    };
    loadMuseums();
  }, []);

  // Auto-progress for Step 4
  useEffect(() => {
    if (currentStep === 4) {
      const interval = setInterval(() => {
        setIngestProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIngestStatus("READY");
            // Auto-advance to step 5 after completion
            setTimeout(() => {
              setCurrentStep(5);
            }, 1500);
            return 100;
          }
          return prev + 15;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [currentStep]);

  const handleStep1Submit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For demo purposes, store museum data in localStorage
      const museumId = `museum_${Date.now()}`;
      localStorage.setItem('selectedMuseum', JSON.stringify({
        id: museumId,
        name: museumData.name,
        website: museumData.website,
        description: museumData.description
      }));
      
      setMuseumId(museumId);
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!museumId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append("file", file);
      });
      
      const response = await fetch(`/api/museums/${museumId}/archives`, {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload files");
      }
      
      const data = await response.json();
      setArchives(prev => [...prev, data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleURLUpload = async (url: string) => {
    if (!museumId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/museums/${museumId}/archives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        throw new Error("Failed to add URL");
      }
      
      const data = await response.json();
      setArchives(prev => [...prev, data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIngest = async () => {
    if (!museumId) return;
    
    setIsLoading(true);
    setError(null);
    setIngestProgress(0);
    
    try {
      const response = await fetch(`/api/museums/${museumId}/ingest`, {
        method: "POST"
      });
      
      if (!response.ok) {
        throw new Error("Failed to start ingest");
      }
      
      setIngestStatus("INDEXING");
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setIngestProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 1000);
      
      // Poll for status
      const pollStatus = async () => {
        try {
          const statusResponse = await fetch(`/api/museums/${museumId}/ingest/status`);
          const statusData = await statusResponse.json();
          
          if (statusData.overallStatus === "READY") {
            setIngestStatus("READY");
            setIngestProgress(100);
            clearInterval(progressInterval);
            setTimeout(() => setCurrentStep(5), 1000);
          } else if (statusData.overallStatus === "FAILED") {
            setIngestStatus("FAILED");
            setError("Ingest failed");
            clearInterval(progressInterval);
          } else {
            setTimeout(pollStatus, 2000);
          }
        } catch (err) {
          setError("Failed to check status");
          clearInterval(progressInterval);
        }
      };
      
      setTimeout(pollStatus, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFloorplanSave = async (data: any) => {
    if (!museumId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/museums/${museumId}/floorplan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structure: data })
      });
      
      if (!response.ok) {
        throw new Error("Failed to save floorplan");
      }
      
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTourPreview = async (formData: FormData) => {
    if (!museumId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const interests = formData.getAll("interests") as string[];
      const level = formData.get("level") as string;
      const minutes = Number(formData.get("minutes"));
      
      // Get stored museum data
      const storedMuseum = localStorage.getItem('selectedMuseum');
      const museumData = storedMuseum ? JSON.parse(storedMuseum) : { name: "Обраний музей" };
      
      const response = await fetch("/api/tours/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          museumName: museumData.name,
          level,
          minutes,
          interests
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate tour preview");
      }
      
      const data = await response.json();
      setTourPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => {
    const filteredMuseums = availableMuseums.filter(museum =>
      museum.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle>{uk.step1}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="search">Пошук музею</Label>
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Введіть назву музею для пошуку..."
              className="mb-4"
            />
          </div>
          
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            {filteredMuseums.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Музеїв не знайдено
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMuseums.map((museum) => (
                  <div
                    key={museum}
                    className={`p-3 cursor-pointer hover:bg-gray-50 border-b ${
                      museumData.name === museum ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setMuseumData(prev => ({ ...prev, name: museum }))}
                  >
                    <div className="font-medium">{museum}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {museumData.name && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <strong>Обрано:</strong> {museumData.name}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle>{uk.step2}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>{uk.uploadArchiveHint}</Label>
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.docx,.zip"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="mt-2"
          />
        </div>
        
        <div className="text-center text-gray-500">або</div>
        
        <div>
          <Label>{uk.registryLinkHint}</Label>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="https://example.com/archive"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const url = e.currentTarget.value;
                  if (url) handleURLUpload(url);
                }
              }}
            />
            <Button onClick={() => {
              const input = document.querySelector('input[placeholder*="https://"]') as HTMLInputElement;
              if (input?.value) handleURLUpload(input.value);
            }}>
              Додати
            </Button>
          </div>
        </div>

        {archives.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Завантажені файли:</h4>
            <div className="space-y-2">
              {archives.map((archive) => (
                <div key={archive.id} className="flex items-center gap-2">
                  <Badge variant={archive.status === "READY" ? "default" : "secondary"}>
                    {archive.filename}
                  </Badge>
                  <span className="text-sm text-gray-500">{archive.status}</span>
                </div>
              ))}
            </div>
            <Button onClick={handleIngest} disabled={isLoading} className="mt-4">
              {isLoading ? "Обробка..." : uk.startProcessing}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle>{uk.step3}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={floorplanTab} onValueChange={(value) => setFloorplanTab(value as 'upload' | 'create')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">📁 Завантажити план</TabsTrigger>
            <TabsTrigger value="create">✏️ Створити план</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="mt-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Завантажте план поверху музею</h3>
                <p className="text-gray-600 mb-4">
                  Завантажте зображення плану поверху музею у форматі JPG, PNG або PDF
                </p>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <div className="space-y-4">
                  <div className="text-4xl">📁</div>
                  <div>
                    <p className="text-lg font-medium">Перетягніть файл сюди</p>
                    <p className="text-sm text-gray-500">або</p>
                  </div>
                  <Button 
                    onClick={() => {
                      // Handle file upload
                      console.log("Upload floorplan");
                    }}
                    className="bg-black hover:bg-gray-800 text-white"
                  >
                    Обрати файл
                  </Button>
                  <p className="text-xs text-gray-400">
                    Підтримуються формати: JPG, PNG, PDF (до 10MB)
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Порада:</h4>
                <p className="text-sm text-blue-700">
                  Для кращих результатів використовуйте чіткі зображення планів поверху з позначеннями залів та експонатів.
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="create" className="mt-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Створіть план поверху вручну</h3>
                <p className="text-gray-600 mb-4">
                  Використовуйте редактор для створення плану поверху музею
                </p>
              </div>
              
              <FloorplanEditor
                museumId={museumId!}
                onSave={handleFloorplanSave}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">✨ {uk.step4}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          {/* Magical progress bar with animation */}
          <div className="relative">
            <Progress value={ingestProgress} className="mb-4 h-3" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold text-white bg-black px-3 py-1 rounded-full">
                {ingestProgress}%
              </span>
            </div>
          </div>
          
          {/* Dynamic status with emojis */}
          <div className="space-y-2">
            <p className="text-xl font-semibold">
              {ingestStatus === "READY" ? "🎉 " + uk.ready : "⚡ " + uk.indexing}
            </p>
            
            {ingestStatus === "READY" ? (
              <div className="space-y-2">
                <p className="text-green-600 font-medium">
                  ✨ Дані успішно оброблено!
                </p>
                <p className="text-sm text-gray-600 animate-pulse">
                  🚀 Переходимо до наступного кроку...
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-blue-600 font-medium">
                  🔄 Обробляємо ваші архіви...
                </p>
                <p className="text-sm text-gray-600">
                  ⏳ Зачекайте, будь ласка. Це займе лише кілька секунд.
                </p>
              </div>
            )}
          </div>
          
          {/* Magical loading animation */}
          {ingestStatus !== "READY" && (
            <div className="flex justify-center space-x-1 mt-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📱 Попередній перегляд туру
          </CardTitle>
          <div className="text-gray-600 space-y-3">
            <p>
              Спробуйте маршрут у ролі відвідувача: оберіть параметри та пройдіть тур від першої кімнати до фіналу.
            </p>
            <p>
              Під час проходження використовуйте швидкі дії: оцінюйте зупинки, залишайте короткі коментарі, пропонуйте заміни або позначайте неточності. Ваш відгук допоможе нам удосконалити маршрут для наступних відвідувачів.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {museumId && (
            <MobilePreview 
              museumId={museumId}
              onPreviewGenerated={(preview) => {
                console.log("Preview generated:", preview);
                // Handle preview generation if needed
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Separate Feedback Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💬 Оцініть якість туру
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <button 
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                rating === 'positive' 
                  ? 'bg-green-200 text-green-800' 
                  : 'bg-green-100 hover:bg-green-200 text-gray-700'
              }`}
              onClick={() => setRating(rating === 'positive' ? null : 'positive')}
            >
              <span className="text-xl">👍</span>
              <span className="font-medium">Добре</span>
            </button>
            <button 
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                rating === 'negative' 
                  ? 'bg-red-200 text-red-800' 
                  : 'bg-red-100 hover:bg-red-200 text-gray-700'
              }`}
              onClick={() => setRating(rating === 'negative' ? null : 'negative')}
            >
              <span className="text-xl">👎</span>
              <span className="font-medium">Погано</span>
            </button>
          </div>
          
          <div>
            <Label htmlFor="feedback" className="text-sm font-medium text-gray-700">
              Що вам сподобалося або не сподобалося в турі?
            </Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Наприклад: 'Дуже цікаво про історію, але хотілося б більше деталей про експонати'"
              className="mt-2"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{uk.title}</h1>
        <div className="flex justify-center mt-4">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-300 rounded text-red-700">
          {error}
        </div>
      )}

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
      {currentStep === 5 && renderStep5()}

      {/* Navigation buttons at the bottom */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="px-6"
        >
          {uk.back}
        </Button>
        
        {currentStep === 1 && (
          <Button
            onClick={handleStep1Submit}
            disabled={!museumData.name || isLoading}
            className="px-12 py-4 text-xl font-bold bg-black hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            size="lg"
          >
            {isLoading ? "Створення..." : "🚀 Почати створення туру"}
          </Button>
        )}
        
        {currentStep < 5 && currentStep !== 1 && currentStep !== 4 && (
          <Button
            onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
            disabled={currentStep === 5}
            className="px-8 py-3 text-lg font-semibold bg-black hover:bg-gray-800 text-white"
            size="lg"
          >
            {uk.next}
          </Button>
        )}
      </div>
    </div>
  );
}
