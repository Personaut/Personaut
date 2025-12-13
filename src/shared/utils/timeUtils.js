"use strict";
/**
 * Time utility functions for formatting and working with time values.
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatElapsedTime = formatElapsedTime;
exports.formatTimestamp = formatTimestamp;
exports.getRelativeTime = getRelativeTime;
exports.sleep = sleep;
/**
 * Format elapsed time in milliseconds for display.
 * - Less than 1 second: displays as milliseconds (e.g., "500ms")
 * - Less than 1 minute: displays as seconds (e.g., "45s")
 * - 1 minute or more: displays as minutes and seconds (e.g., "2m 30s")
 *
 * @param elapsedMs - Elapsed time in milliseconds
 * @returns Formatted time string
 */
function formatElapsedTime(elapsedMs) {
    if (elapsedMs < 0) {
        return '0ms';
    }
    if (elapsedMs < 1000) {
        return `${Math.round(elapsedMs)}ms`;
    }
    const seconds = Math.floor(elapsedMs / 1000);
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}
/**
 * Format a timestamp as a human-readable date string.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param includeTime - Whether to include time (default: true)
 * @returns Formatted date string
 */
function formatTimestamp(timestamp, includeTime = true) {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
        return 'Invalid date';
    }
    const dateStr = date.toLocaleDateString();
    if (!includeTime) {
        return dateStr;
    }
    const timeStr = date.toLocaleTimeString();
    return `${dateStr} ${timeStr}`;
}
/**
 * Get a relative time string (e.g., "2 hours ago", "just now").
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string
 */
function getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 0) {
        return 'in the future';
    }
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 10) {
        return 'just now';
    }
    if (seconds < 60) {
        return `${seconds} seconds ago`;
    }
    if (minutes < 60) {
        return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }
    if (hours < 24) {
        return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    if (days < 30) {
        return days === 1 ? '1 day ago' : `${days} days ago`;
    }
    return formatTimestamp(timestamp, false);
}
/**
 * Sleep for a specified duration.
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the duration
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=timeUtils.js.map