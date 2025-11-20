"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, GripVertical } from "lucide-react";
import { useCardPosition } from "@/hooks/use-card-position";
import { cn } from "@/lib/utils";

interface CollapsibleLevelCardProps {
  levelId: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultPosition?: { x: number; y: number };
}

export function CollapsibleLevelCard({ 
  levelId, 
  title, 
  children, 
  className,
  defaultPosition = { x: 20, y: 20 }
}: CollapsibleLevelCardProps) {
  const { isMinimized, position, toggleMinimize, setPosition, isLoaded } = useCardPosition(levelId, defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      
      setPosition({
        x: Math.max(0, position.x + dx), // Prevent dragging off left
        y: Math.max(0, position.y + dy), // Prevent dragging off top
      });
      
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, position, setPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if clicking header/grip
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  if (!isLoaded) return null; // Prevent flash of default position

  return (
    <div 
      ref={cardRef}
      style={{ 
        position: 'absolute', 
        left: position.x, 
        top: position.y,
        zIndex: 50 
      }}
      className={cn("w-full max-w-md transition-opacity duration-200", className)}
    >
      <Card className="bg-slate-900/90 backdrop-blur border-slate-700 shadow-xl">
        <CardHeader 
          className="p-3 flex flex-row items-center justify-between space-y-0 cursor-move select-none" 
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-base font-bold text-white">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-slate-800" onClick={toggleMinimize}>
              {isMinimized ? <Plus className="w-4 h-4 text-slate-400" /> : <Minus className="w-4 h-4 text-slate-400" />}
            </Button>
          </div>
        </CardHeader>
        {!isMinimized && (
          <CardContent className="p-4 pt-0 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {children}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
