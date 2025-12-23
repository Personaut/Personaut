import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScreenshotCapture } from '../components/ScreenshotCapture';

describe('ScreenshotCapture', () => {
    const defaultProps = {
        screenshot: null,
        onCapture: jest.fn(),
        onCaptureUrl: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders drop zone when no screenshot', () => {
        render(<ScreenshotCapture {...defaultProps} />);
        expect(screen.getByText(/Drop an image here/i)).toBeInTheDocument();
    });

    it('renders URL input when onCaptureUrl provided', () => {
        render(<ScreenshotCapture {...defaultProps} />);
        expect(screen.getByPlaceholderText(/https:\/\/example.com/i)).toBeInTheDocument();
    });

    it('renders capture button', () => {
        render(<ScreenshotCapture {...defaultProps} />);
        expect(screen.getByRole('button', { name: /Capture/i })).toBeInTheDocument();
    });

    it('disables capture button when URL is empty', () => {
        render(<ScreenshotCapture {...defaultProps} />);
        const button = screen.getByRole('button', { name: /Capture/i });
        expect(button).toBeDisabled();
    });

    it('enables capture button when URL is entered', () => {
        render(<ScreenshotCapture {...defaultProps} />);
        const input = screen.getByPlaceholderText(/https:\/\/example.com/i);
        fireEvent.change(input, { target: { value: 'https://test.com' } });
        const button = screen.getByRole('button', { name: /Capture/i });
        expect(button).not.toBeDisabled();
    });

    it('calls onCaptureUrl when capture button clicked', () => {
        render(<ScreenshotCapture {...defaultProps} />);
        const input = screen.getByPlaceholderText(/https:\/\/example.com/i);
        fireEvent.change(input, { target: { value: 'https://test.com' } });
        const button = screen.getByRole('button', { name: /Capture/i });
        fireEvent.click(button);
        expect(defaultProps.onCaptureUrl).toHaveBeenCalledWith('https://test.com');
    });

    it('renders screenshot preview when screenshot provided', () => {
        const screenshotProps = {
            ...defaultProps,
            screenshot: {
                url: 'data:image/png;base64,test',
                source: 'file' as const,
                fileName: 'test.png',
                capturedAt: Date.now(),
            },
        };
        render(<ScreenshotCapture {...screenshotProps} />);
        expect(screen.getByAltText('Screenshot')).toBeInTheDocument();
        expect(screen.getByText(/Uploaded: test.png/i)).toBeInTheDocument();
    });

    it('shows clear button when screenshot provided', () => {
        const screenshotProps = {
            ...defaultProps,
            screenshot: {
                url: 'data:image/png;base64,test',
                source: 'file' as const,
                capturedAt: Date.now(),
            },
        };
        render(<ScreenshotCapture {...screenshotProps} />);
        expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument();
    });

    it('calls onCapture(null) when clear clicked', () => {
        const screenshotProps = {
            ...defaultProps,
            screenshot: {
                url: 'data:image/png;base64,test',
                source: 'file' as const,
                capturedAt: Date.now(),
            },
        };
        render(<ScreenshotCapture {...screenshotProps} />);
        const clearButton = screen.getByRole('button', { name: /Clear/i });
        fireEvent.click(clearButton);
        expect(defaultProps.onCapture).toHaveBeenCalledWith(null);
    });

    it('shows loading state when isLoading', () => {
        render(<ScreenshotCapture {...defaultProps} isLoading={true} />);
        expect(screen.getByText(/Capturing screenshot/i)).toBeInTheDocument();
    });

    it('disables controls when disabled', () => {
        render(<ScreenshotCapture {...defaultProps} disabled={true} />);
        const input = screen.getByPlaceholderText(/https:\/\/example.com/i);
        expect(input).toBeDisabled();
    });
});
