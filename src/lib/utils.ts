import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLocalTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLocalDateTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(startDate: Date | string, endDate: Date | string | null) {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) : new Date();
  
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
  return `${diffDays}d ${diffHours % 24}h`;
}

export function formatDetailedDuration(startDate: Date | string, endDate: Date | string | null): { days: number; hours: number; minutes: number; seconds: number; totalSeconds: number } {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) : new Date();
  
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return { days, hours, minutes, seconds, totalSeconds };
}

export function formatTimeRange(startDate: Date | string, endDate: Date | string | null) {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) : new Date();
  
  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const startStr = formatTime(start);
  const endStr = formatTime(end);
  
  // Check if same day
  if (start.toDateString() === end.toDateString()) {
    return `${startStr} - ${endStr}`;
  }
  
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function formatJoinDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
