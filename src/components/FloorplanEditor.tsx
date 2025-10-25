"use client";

import React, { useState, useRef, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Text, Image } from "react-konva";
import Konva from "konva";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Room {
  id: string;
  name: string;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

interface Marker {
  id: string;
  title: string;
  roomId: string;
  point: [number, number]; // [x, y]
  keywords: string[];
  estMinutes: number;
}

interface FloorplanData {
  floors: Array<{
    name: string;
    rooms: Room[];
    markers: Marker[];
  }>;
}

interface FloorplanEditorProps {
  museumId: string;
  initialData?: FloorplanData;
  onSave: (data: FloorplanData) => Promise<void>;
}

export function FloorplanEditor({ museumId, initialData, onSave }: FloorplanEditorProps) {
  const [floors, setFloors] = useState<FloorplanData["floors"]>(
    initialData?.floors || [
      {
        name: "Поверх 1",
        rooms: [
          { id: "r1", name: "Зал 1", bbox: [100, 80, 240, 160] }
        ],
        markers: []
      }
    ]
  );
  
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [selectedTool, setSelectedTool] = useState<"room" | "marker">("room");
  const [isDrawing, setIsDrawing] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newMarkerTitle, setNewMarkerTitle] = useState("");
  const [newMarkerKeywords, setNewMarkerKeywords] = useState("");
  const [newMarkerMinutes, setNewMarkerMinutes] = useState(5);
  
  const stageRef = useRef<Konva.Stage>(null);

  const currentFloor = floors[selectedFloor];

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (selectedTool === "room" && isDrawing) {
      // Add room logic would go here
      setIsDrawing(false);
    } else if (selectedTool === "marker") {
      const stage = e.target.getStage();
      const pointerPosition = stage?.getPointerPosition();
      if (pointerPosition) {
        const newMarker: Marker = {
          id: `m${Date.now()}`,
          title: newMarkerTitle || `Маркер ${currentFloor.markers.length + 1}`,
          roomId: "r1", // Default to first room
          point: [pointerPosition.x, pointerPosition.y],
          keywords: newMarkerKeywords.split(",").map(k => k.trim()).filter(Boolean),
          estMinutes: newMarkerMinutes
        };

        setFloors(prev => prev.map((floor, index) => 
          index === selectedFloor 
            ? { ...floor, markers: [...floor.markers, newMarker] }
            : floor
        ));

        setNewMarkerTitle("");
        setNewMarkerKeywords("");
      }
    }
  }, [selectedTool, isDrawing, selectedFloor, newMarkerTitle, newMarkerKeywords, newMarkerMinutes, currentFloor.markers.length]);

  const handleSave = async () => {
    const data: FloorplanData = { floors };
    await onSave(data);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Редактор плану поверху</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Floor selector */}
          <div className="flex gap-2">
            {floors.map((floor, index) => (
              <Button
                key={index}
                variant={selectedFloor === index ? "default" : "outline"}
                onClick={() => setSelectedFloor(index)}
              >
                {floor.name}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const newFloor = {
                  name: `Поверх ${floors.length + 1}`,
                  rooms: [],
                  markers: []
                };
                setFloors(prev => [...prev, newFloor]);
                setSelectedFloor(floors.length);
              }}
            >
              + Додати поверх
            </Button>
          </div>

          {/* Tool selector */}
          <div className="flex gap-2">
            <Button
              variant={selectedTool === "room" ? "default" : "outline"}
              onClick={() => setSelectedTool("room")}
            >
              Кімнати
            </Button>
            <Button
              variant={selectedTool === "marker" ? "default" : "outline"}
              onClick={() => setSelectedTool("marker")}
            >
              Маркери
            </Button>
          </div>

          {/* Marker form */}
          {selectedTool === "marker" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="marker-title">Назва маркера</Label>
                <Input
                  id="marker-title"
                  value={newMarkerTitle}
                  onChange={(e) => setNewMarkerTitle(e.target.value)}
                  placeholder="Артефакт А"
                />
              </div>
              <div>
                <Label htmlFor="marker-keywords">Ключові слова (через кому)</Label>
                <Input
                  id="marker-keywords"
                  value={newMarkerKeywords}
                  onChange={(e) => setNewMarkerKeywords(e.target.value)}
                  placeholder="економіка, XVIII ст."
                />
              </div>
              <div>
                <Label htmlFor="marker-minutes">Хвилин на огляд</Label>
                <Input
                  id="marker-minutes"
                  type="number"
                  value={newMarkerMinutes}
                  onChange={(e) => setNewMarkerMinutes(Number(e.target.value))}
                  min="1"
                  max="60"
                />
              </div>
            </div>
          )}

          {/* Canvas */}
          <div className="border rounded-lg overflow-hidden">
            <Stage
              ref={stageRef}
              width={800}
              height={400}
              onClick={handleStageClick}
              className="bg-gray-50"
            >
              <Layer>
                {/* Draw rooms */}
                {currentFloor.rooms.map((room) => (
                  <Rect
                    key={room.id}
                    x={room.bbox[0]}
                    y={room.bbox[1]}
                    width={room.bbox[2]}
                    height={room.bbox[3]}
                    fill="lightblue"
                    stroke="blue"
                    strokeWidth={2}
                  />
                ))}

                {/* Draw room labels */}
                {currentFloor.rooms.map((room) => (
                  <Text
                    key={`label-${room.id}`}
                    x={room.bbox[0] + 10}
                    y={room.bbox[1] + 10}
                    text={room.name}
                    fontSize={16}
                    fill="black"
                  />
                ))}

                {/* Draw markers */}
                {currentFloor.markers.map((marker) => (
                  <Circle
                    key={marker.id}
                    x={marker.point[0]}
                    y={marker.point[1]}
                    radius={8}
                    fill="red"
                    stroke="darkred"
                    strokeWidth={2}
                  />
                ))}

                {/* Draw marker labels */}
                {currentFloor.markers.map((marker) => (
                  <Text
                    key={`marker-label-${marker.id}`}
                    x={marker.point[0] + 15}
                    y={marker.point[1] - 5}
                    text={marker.title}
                    fontSize={12}
                    fill="black"
                  />
                ))}
              </Layer>
            </Stage>
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600">
            {selectedTool === "marker" && (
              <p>Натисніть на план, щоб додати маркер експоната</p>
            )}
            {selectedTool === "room" && (
              <p>Інструмент для додавання кімнат (поки що використовуйте існуючі)</p>
            )}
          </div>

          {/* Save button */}
          <Button onClick={handleSave} className="w-full">
            Зберегти план поверху
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
