/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  deleteDoc,
  getDocs,
  where
} from 'firebase/firestore';
import { 
  Pencil, 
  Eraser, 
  Minus, 
  Square, 
  Circle, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Move, 
  MessageSquare,
  X,
  Send,
  Palette,
  RotateCcw
} from 'lucide-react';
import { cn } from '../lib/utils';

// Types
interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  userId: string;
  username: string;
  tool: 'brush' | 'eraser' | 'line' | 'rectangle' | 'circle';
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  timestamp: Timestamp;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Timestamp;
}

interface UserCursor {
  userId: string;
  username: string;
  x: number;
  y: number;
  color: string;
}

// Generate a random color for user cursor
const getRandomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

const Canvas: React.FC = () => {
  const { user, profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Canvas state
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // View state (pan/zoom)
  const [viewOffset, setViewOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  
  // Tool state
  const [activeTool, setActiveTool] = useState<'brush' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'pan'>('brush');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [brushOpacity, setBrushOpacity] = useState(1);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  
  // Other users' cursors
  const [userCursors, setUserCursors] = useState<UserCursor[]>([]);
  
  // Canvas reset timer
  const [lastReset, setLastReset] = useState<Date>(new Date());
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  // Get username from profile or email
  const getUsername = useCallback(() => {
    if (profile?.displayName) return profile.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'Anonymous';
  }, [user, profile]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    if (!containerRef.current) return { x: screenX, y: screenY };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (screenX - rect.left - viewOffset.x) / zoom,
      y: (screenY - rect.top - viewOffset.y) / zoom
    };
  }, [viewOffset, zoom]);

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback((canvasX: number, canvasY: number): Point => {
    return {
      x: canvasX * zoom + viewOffset.x,
      y: canvasY * zoom + viewOffset.y
    };
  }, [viewOffset, zoom]);

  // Load strokes from Firestore
  useEffect(() => {
    const strokesRef = collection(db, 'canvas_strokes');
    const q = query(strokesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedStrokes: Stroke[] = [];
      snapshot.forEach((doc) => {
        loadedStrokes.push({ id: doc.id, ...doc.data() } as Stroke);
      });
      console.log('Canvas strokes updated:', loadedStrokes.length);
      setStrokes(loadedStrokes);
    }, (error) => {
      console.error('Error loading canvas strokes:', error);
    });

    return () => unsubscribe();
  }, []);

  // Load chat messages from Firestore
  useEffect(() => {
    const messagesRef = collection(db, 'canvas_chat');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        loadedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      console.log('Canvas chat messages updated:', loadedMessages.length);
      setChatMessages(loadedMessages);
    }, (error) => {
      console.error('Error loading canvas chat messages:', error);
    });

    return () => unsubscribe();
  }, []);

  // Load other users' cursors
  useEffect(() => {
    if (!user) return;
    
    const cursorsRef = collection(db, 'canvas_cursors');
    const q = query(cursorsRef, where('userId', '!=', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cursors: UserCursor[] = [];
      snapshot.forEach((doc) => {
        cursors.push({ ...doc.data() } as UserCursor);
      });
      console.log('Canvas cursors updated:', cursors.length);
      setUserCursors(cursors);
    }, (error) => {
      console.error('Error loading canvas cursors:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Update own cursor position
  const updateCursorPosition = useCallback(async (x: number, y: number) => {
    if (!user) return;
    
    const cursorRef = doc(db, 'canvas_cursors', user.uid);
    await setDoc(cursorRef, {
      userId: user.uid,
      username: getUsername(),
      x,
      y,
      color: getRandomColor(),
      timestamp: serverTimestamp()
    }, { merge: true });
  }, [user, getUsername]);

  // Check for 12-hour reset
  useEffect(() => {
    const checkReset = async () => {
      const now = new Date();
      const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceReset >= 12) {
        // Clear all strokes
        const strokesRef = collection(db, 'canvas_strokes');
        const snapshot = await getDocs(strokesRef);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        // Clear chat
        const chatRef = collection(db, 'canvas_chat');
        const chatSnapshot = await getDocs(chatRef);
        const chatDeletePromises = chatSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(chatDeletePromises);
        
        setLastReset(now);
      }
      
      // Update countdown
      const hoursUntilReset = 12 - hoursSinceReset;
      const hours = Math.floor(hoursUntilReset);
      const minutes = Math.floor((hoursUntilReset - hours) * 60);
      setTimeUntilReset(`${hours}h ${minutes}m`);
    };

    checkReset();
    const interval = setInterval(checkReset, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [lastReset]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply view transform
    ctx.save();
    ctx.translate(viewOffset.x, viewOffset.y);
    ctx.scale(zoom, zoom);

    // Draw all strokes
    [...strokes, currentStroke].filter(Boolean).forEach((stroke) => {
      if (!stroke) return;

      ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = stroke.opacity;

      if (stroke.tool === 'brush' || stroke.tool === 'eraser') {
        if (stroke.points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      } else if (stroke.tool === 'line') {
        if (stroke.points.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
        ctx.stroke();
      } else if (stroke.tool === 'rectangle') {
        if (stroke.points.length < 2) return;
        
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        const width = end.x - start.x;
        const height = end.y - start.y;
        
        ctx.strokeRect(start.x, start.y, width, height);
      } else if (stroke.tool === 'circle') {
        if (stroke.points.length < 2) return;
        
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        const radius = Math.sqrt(
          Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    ctx.restore();

    // Draw user cursors
    userCursors.forEach((cursor) => {
      const screenPos = canvasToScreen(cursor.x, cursor.y);
      
      ctx.fillStyle = cursor.color;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000000';
      ctx.font = '12px sans-serif';
      ctx.fillText(cursor.username, screenPos.x + 8, screenPos.y + 4);
    });
  }, [strokes, currentStroke, viewOffset, zoom, userCursors, canvasToScreen]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!user) return;

    const canvasPoint = screenToCanvas(e.clientX, e.clientY);

    if (activeTool === 'pan') {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    setIsDrawing(true);
    
    const newStroke: Stroke = {
      id: generateId(),
      userId: user.uid,
      username: getUsername(),
      tool: activeTool,
      points: [canvasPoint],
      color: brushColor,
      size: brushSize,
      opacity: brushOpacity,
      timestamp: Timestamp.now()
    };

    setCurrentStroke(newStroke);
  }, [user, activeTool, screenToCanvas, brushColor, brushSize, brushOpacity, getUsername]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvasPoint = screenToCanvas(e.clientX, e.clientY);
    
    // Update cursor position
    updateCursorPosition(canvasPoint.x, canvasPoint.y);

    if (isPanning && lastPanPoint) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setViewOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isDrawing || !currentStroke) return;

    setCurrentStroke(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, canvasPoint]
      };
    });
  }, [isDrawing, currentStroke, isPanning, lastPanPoint, screenToCanvas, updateCursorPosition]);

  // Handle mouse up
  const handleMouseUp = useCallback(async () => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }

    if (!isDrawing || !currentStroke) return;

    // Save stroke to Firestore
    const strokeRef = doc(db, 'canvas_strokes', currentStroke.id);
    await setDoc(strokeRef, currentStroke);

    setCurrentStroke(null);
    setIsDrawing(false);
  }, [isDrawing, currentStroke, isPanning]);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!user) return;
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    const canvasPoint = screenToCanvas(touch.clientX, touch.clientY);

    if (activeTool === 'pan') {
      setIsPanning(true);
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      return;
    }

    setIsDrawing(true);
    
    const newStroke: Stroke = {
      id: generateId(),
      userId: user.uid,
      username: getUsername(),
      tool: activeTool,
      points: [canvasPoint],
      color: brushColor,
      size: brushSize,
      opacity: brushOpacity,
      timestamp: Timestamp.now()
    };

    setCurrentStroke(newStroke);
  }, [user, activeTool, screenToCanvas, brushColor, brushSize, brushOpacity, getUsername]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const canvasPoint = screenToCanvas(touch.clientX, touch.clientY);
    
    // Update cursor position
    updateCursorPosition(canvasPoint.x, canvasPoint.y);

    if (isPanning && lastPanPoint) {
      const deltaX = touch.clientX - lastPanPoint.x;
      const deltaY = touch.clientY - lastPanPoint.y;
      
      setViewOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      return;
    }

    if (!isDrawing || !currentStroke) return;

    setCurrentStroke(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, canvasPoint]
      };
    });
  }, [isDrawing, currentStroke, isPanning, lastPanPoint, screenToCanvas, updateCursorPosition]);

  // Handle touch end
  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }

    if (!isDrawing || !currentStroke) return;

    // Save stroke to Firestore
    const strokeRef = doc(db, 'canvas_strokes', currentStroke.id);
    await setDoc(strokeRef, currentStroke);

    setCurrentStroke(null);
    setIsDrawing(false);
  }, [isDrawing, currentStroke, isPanning]);

  // Handle wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * delta));
    
    // Zoom towards mouse position
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const newViewOffset = {
      x: mouseX - (mouseX - viewOffset.x) * (newZoom / zoom),
      y: mouseY - (mouseY - viewOffset.y) * (newZoom / zoom)
    };
    
    setZoom(newZoom);
    setViewOffset(newViewOffset);
  }, [zoom, viewOffset]);

  // Send chat message
  const sendChatMessage = useCallback(async () => {
    if (!user || !chatInput.trim()) return;

    const message: Omit<ChatMessage, 'id'> = {
      userId: user.uid,
      username: getUsername(),
      message: chatInput.trim(),
      timestamp: Timestamp.now()
    };

    const messagesRef = collection(db, 'canvas_chat');
    await setDoc(doc(messagesRef), message);
    
    setChatInput('');
  }, [user, chatInput, getUsername]);

  // Clear canvas (admin only or every 12 hours)
  const clearCanvas = useCallback(async () => {
    const strokesRef = collection(db, 'canvas_strokes');
    const snapshot = await getDocs(strokesRef);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    setLastReset(new Date());
  }, []);

  // Reset view
  const resetView = useCallback(() => {
    setViewOffset({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // Color presets
  const colorPresets = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-[var(--bg-main)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-[var(--bg-surface)] border-b border-[var(--bg-panel)] flex-wrap">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 border-r border-[var(--bg-panel)] pr-2">
          <button
            onClick={() => setActiveTool('brush')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'brush' 
                ? "bg-[var(--accent-main)] text-white" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
            )}
            title="Brush"
          >
            <Pencil size={20} />
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'eraser' 
                ? "bg-[var(--accent-main)] text-white" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
            )}
            title="Eraser"
          >
            <Eraser size={20} />
          </button>
          <button
            onClick={() => setActiveTool('line')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'line' 
                ? "bg-[var(--accent-main)] text-white" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
            )}
            title="Line"
          >
            <Minus size={20} />
          </button>
          <button
            onClick={() => setActiveTool('rectangle')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'rectangle' 
                ? "bg-[var(--accent-main)] text-white" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
            )}
            title="Rectangle"
          >
            <Square size={20} />
          </button>
          <button
            onClick={() => setActiveTool('circle')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'circle' 
                ? "bg-[var(--accent-main)] text-white" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
            )}
            title="Circle"
          >
            <Circle size={20} />
          </button>
          <button
            onClick={() => setActiveTool('pan')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'pan' 
                ? "bg-[var(--accent-main)] text-white" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
            )}
            title="Pan"
          >
            <Move size={20} />
          </button>
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-2 border-r border-[var(--bg-panel)] pr-2">
          <div className="flex items-center gap-1">
            <Palette size={16} className="text-[var(--text-secondary)]" />
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0"
              title="Color Picker"
            />
          </div>
          <div className="flex gap-1">
            {colorPresets.map((color) => (
              <button
                key={color}
                onClick={() => setBrushColor(color)}
                className={cn(
                  "w-6 h-6 rounded border-2 transition-transform hover:scale-110",
                  brushColor === color ? "border-[var(--accent-main)] scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-2 border-r border-[var(--bg-panel)] pr-2">
          <span className="text-sm text-[var(--text-secondary)]">Size:</span>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-[var(--text-secondary)] w-6">{brushSize}</span>
        </div>

        {/* Opacity */}
        <div className="flex items-center gap-2 border-r border-[var(--bg-panel)] pr-2">
          <span className="text-sm text-[var(--text-secondary)]">Opacity:</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={brushOpacity}
            onChange={(e) => setBrushOpacity(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-[var(--text-secondary)] w-8">{Math.round(brushOpacity * 100)}%</span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 border-r border-[var(--bg-panel)] pr-2">
          <button
            onClick={() => setZoom(prev => Math.max(0.1, prev * 0.9))}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <span className="text-sm text-[var(--text-secondary)] w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(5, prev * 1.1))}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={resetView}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] transition-colors"
            title="Reset View"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={clearCanvas}
            className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
            title="Clear Canvas"
          >
            <Trash2 size={20} />
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showChat 
                ? "bg-[var(--accent-main)] text-white" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
            )}
            title="Toggle Chat"
          >
            <MessageSquare size={20} />
          </button>
        </div>

        {/* Reset Timer */}
        <div className="ml-auto text-sm text-[var(--text-secondary)]">
          Resets in: {timeUntilReset}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-gray-100"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            cursor: activeTool === 'pan' ? 'grab' : 'crosshair', 
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
        >
          <canvas
            ref={canvasRef}
            width={containerRef.current?.clientWidth || 800}
            height={containerRef.current?.clientHeight || 600}
            className="absolute top-0 left-0"
          />
          
          {/* Instructions */}
          <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs p-2 rounded">
            <p>Scroll to zoom • Click/touch and drag to draw • Use Pan tool to move</p>
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="w-80 bg-[var(--bg-surface)] border-l border-[var(--bg-panel)] flex flex-col">
            <div className="p-3 border-b border-[var(--bg-panel)] flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text-primary)]">Live Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 rounded hover:bg-[var(--bg-panel)] transition-colors"
              >
                <X size={16} className="text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "p-2 rounded-lg",
                    msg.userId === user?.uid 
                      ? "bg-[var(--accent-main)]/10 ml-4" 
                      : "bg-[var(--bg-panel)] mr-4"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[var(--accent-main)]">
                      {msg.username}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {msg.timestamp?.toDate?.()?.toLocaleTimeString() || 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-primary)]">{msg.message}</p>
                </div>
              ))}
              {chatMessages.length === 0 && (
                <p className="text-center text-[var(--text-muted)] text-sm py-8">
                  No messages yet. Start the conversation!
                </p>
              )}
            </div>
            
            <div className="p-3 border-t border-[var(--bg-panel)]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-panel)] text-[var(--text-primary)] placeholder-[var(--text-muted)] border-0 focus:ring-2 focus:ring-[var(--accent-main)]"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim()}
                  className="p-2 rounded-lg bg-[var(--accent-main)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent-main)]/90 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Canvas;
