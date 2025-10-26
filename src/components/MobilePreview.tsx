"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ChipData {
  motivations: string[];
  interests: string[];
  levels: string[];
  times: string[];
}

interface Selections {
  motivations: string[];
  interests: string[];
  level: string;
  time: string;
}

interface PreviewData {
  welcome: {
    title: string;
    paragraph: string;
  };
  outline: Array<{
    room: string;
    summary: string;
    key_objects?: string[];
    source_refs?: string[];
  }>;
  time_note: string;
  cta_label?: string;
}

interface MobilePreviewProps {
  museumId: string;
  onPreviewGenerated: (preview: PreviewData) => void;
}

export function MobilePreview({ museumId, onPreviewGenerated }: MobilePreviewProps) {
  const [chips, setChips] = useState<ChipData>({
    motivations: [],
    interests: [],
    levels: ["Для дітей", "Базовий", "Поглиблений", "Професійний"],
    times: ["30 хв", "60 хв", "90 хв", "120+ хв"]
  });
  const [selections, setSelections] = useState<Selections>({
    motivations: [],
    interests: [],
    level: "",
    time: ""
  });
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChips, setIsLoadingChips] = useState(true);
  const [currentStep, setCurrentStep] = useState<'chips' | 'preview'>('chips');

  // Load chips on mount
  useEffect(() => {
    loadChips();
  }, [museumId]);

  const loadChips = async () => {
    setIsLoadingChips(true);
    
    // Fallback chips in case API fails
    const fallbackChips = {
      motivations: [
        "Хочу більше дізнатись про авторів",
        "Хочу розібратися з колекцією", 
        "Вперше тут",
        "Я турист",
        "Тимчасові виставки",
        "Атмосфера і простір",
        "Фото-можливості",
        "Для дітей/сім'ї",
        "Рекомендація друзів",
        "Освітня мета / дослідження"
      ],
      interests: [
        "Європейський живопис",
        "Ренесанс",
        "Бароко / Рококо",
        "Портрет / Пейзаж / Натюрморт",
        "Іконопис",
        "Скульптура",
        "Декоративно-ужиткове",
        "Азійське мистецтво",
        "Античність / Археологія",
        "Релігія та міфологія",
        "Історія і суспільство",
        "Техніка та матеріали",
        "Колекціонери та меценати"
      ],
      levels: ["Для дітей", "Базовий", "Поглиблений", "Професійний"],
      times: ["30 хв", "60 хв", "90 хв", "120+ хв"]
    };

    try {
      // Get museum data from localStorage
      const storedMuseum = localStorage.getItem('selectedMuseum');
      if (!storedMuseum) {
        console.error("No museum data found in localStorage, using fallback chips");
        setChips(fallbackChips);
        setIsLoadingChips(false);
        return;
      }
      
      const museumData = JSON.parse(storedMuseum);
      console.log("Loading chips for museum:", museumData.name);
      
      const response = await fetch('/api/dynamic-chips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          museumId: museumId,
          museumData: museumData
        })
      });
      
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Loaded dynamic chips:", data);
      setChips(data);
    } catch (error) {
      console.error("Failed to load chips:", error);
      console.log("Using fallback chips");
      setChips(fallbackChips);
    } finally {
      setIsLoadingChips(false);
    }
  };

  const toggleSelection = (category: 'motivations' | 'interests', value: string) => {
    setSelections(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }));
  };

  const setSingleSelection = (category: 'level' | 'time', value: string) => {
    setSelections(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleContinue = async () => {
    if (!selections.level || !selections.time) {
      alert("Будь ласка, оберіть рівень та час туру");
      return;
    }

    setIsLoading(true);
    try {
      // Get museum data from localStorage
      const storedMuseum = localStorage.getItem('selectedMuseum');
      if (!storedMuseum) {
        alert("Помилка: дані музею не знайдено");
        return;
      }
      
      const museumData = JSON.parse(storedMuseum);
      console.log("Generating story intro for museum:", museumData.name);
      
      const response = await fetch('/api/story-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          museumId, 
          selections,
          museumData 
        })
      });
      
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      
      const storyIntro = await response.json();
      console.log("Generated story intro:", storyIntro);
      setPreview(storyIntro);
      setCurrentStep('preview');
      onPreviewGenerated(storyIntro);
    } catch (error) {
      console.error("Failed to generate story intro:", error);
      alert("Помилка при генерації вступу до туру");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTour = () => {
    // This would start the actual tour
    alert("Тур розпочато! (Демо режим)");
  };

  if (currentStep === 'preview' && preview) {
    return (
      <div className="max-w-sm mx-auto bg-gray-900 rounded-3xl p-4 shadow-2xl">
        <div className="bg-white rounded-2xl overflow-hidden min-h-[600px]">
          {/* Mobile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 text-center">
            <h2 className="text-lg font-bold">{preview.welcome.title}</h2>
          </div>
          
          {/* Mobile Content */}
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {/* Welcome paragraph */}
            <div>
              <p className="text-sm text-gray-700 leading-relaxed">{preview.welcome.paragraph}</p>
            </div>

            {/* Room outline */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Маршрут туру:</h3>
              <div className="space-y-3">
                {preview.outline.map((room, index) => (
                  <div key={index} className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-blue-800">{room.room}</h4>
                      <p className="text-xs text-gray-700">{room.summary}</p>
                      
                      {/* Key objects */}
                      {room.key_objects && room.key_objects.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-600 mb-1">Ключові об'єкти:</p>
                          <div className="flex flex-wrap gap-1">
                            {room.key_objects.map((object, objIndex) => (
                              <span key={objIndex} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {object}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Source references */}
                      {room.source_refs && room.source_refs.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs text-gray-400">
                            Джерела: {room.source_refs.join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time note */}
            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
              <p className="text-sm text-green-700 font-medium">{preview.time_note}</p>
            </div>
          </div>
          
          {/* Mobile Footer */}
          <div className="bg-gray-50 p-4 border-t">
            <Button 
              onClick={handleStartTour}
              className="w-full bg-black hover:bg-gray-800 text-white"
            >
              {preview.cta_label || "Розпочати тур"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-gray-900 rounded-3xl p-4 shadow-2xl">
      <div className="bg-white rounded-2xl overflow-hidden min-h-[600px]">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 text-center">
          <h2 className="text-lg font-bold">Оберіть параметри для персонального туру</h2>
          <p className="text-sm opacity-90">Позначте те, що вам підходить. Можна кілька варіантів (окрім часу).</p>
        </div>
        
        {/* Mobile Content */}
        <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
          {isLoadingChips ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Завантаження персоналізованих варіантів...</p>
            </div>
          ) : (
            <>
              {/* Motivations */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Що вас привернуло в музей?</h3>
                <div className="flex flex-wrap gap-2">
                  {chips.motivations.map((motivation) => (
                    <Badge
                      key={motivation}
                      variant={selections.motivations.includes(motivation) ? "default" : "outline"}
                      className={`cursor-pointer hover:bg-blue-100 ${
                        selections.motivations.includes(motivation) 
                          ? "bg-black text-white hover:bg-gray-800" 
                          : "hover:bg-blue-100"
                      }`}
                      onClick={() => toggleSelection('motivations', motivation)}
                    >
                      {motivation}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Які ваші інтереси?</h3>
                <div className="flex flex-wrap gap-2">
                  {chips.interests.map((interest) => (
                    <Badge
                      key={interest}
                      variant={selections.interests.includes(interest) ? "default" : "outline"}
                      className={`cursor-pointer hover:bg-blue-100 ${
                        selections.interests.includes(interest) 
                          ? "bg-black text-white hover:bg-gray-800" 
                          : "hover:bg-blue-100"
                      }`}
                      onClick={() => toggleSelection('interests', interest)}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Level */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Рівень туру</h3>
                <div className="flex flex-wrap gap-2">
                  {chips.levels.map((level) => (
                    <Badge
                      key={level}
                      variant={selections.level === level ? "default" : "outline"}
                      className={`cursor-pointer hover:bg-blue-100 ${
                        selections.level === level 
                          ? "bg-black text-white hover:bg-gray-800" 
                          : "hover:bg-blue-100"
                      }`}
                      onClick={() => setSingleSelection('level', level)}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Час на візит</h3>
                <div className="flex flex-wrap gap-2">
                  {chips.times.map((time) => (
                    <Badge
                      key={time}
                      variant={selections.time === time ? "default" : "outline"}
                      className={`cursor-pointer hover:bg-blue-100 ${
                        selections.time === time 
                          ? "bg-black text-white hover:bg-gray-800" 
                          : "hover:bg-blue-100"
                      }`}
                      onClick={() => setSingleSelection('time', time)}
                    >
                      {time}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Mobile Footer */}
        <div className="bg-gray-50 p-4 border-t">
          <Button 
            onClick={handleContinue}
            disabled={isLoading || !selections.level || !selections.time}
            className="w-full bg-black hover:bg-gray-800 text-white"
          >
            {isLoading ? "Генерація..." : "Продовжити"}
          </Button>
        </div>
      </div>
    </div>
  );
}
