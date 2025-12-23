/**
 * Tests for SettingsView component
 * 
 * Tests the settings management interface including
 * API provider configuration, permissions, and rate limits.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsView } from '../../../features/settings/SettingsView';

describe('SettingsView', () => {
    const mockPostMessage = jest.fn();

    beforeEach(() => {
        mockPostMessage.mockClear();
    });

    it('renders without crashing', () => {
        render(<SettingsView postMessage={mockPostMessage} />);
        expect(screen.getByText('General')).toBeInTheDocument();
    });

    it('displays all navigation sections', () => {
        render(<SettingsView postMessage={mockPostMessage} />);
        expect(screen.getByText('General')).toBeInTheDocument();
        expect(screen.getByText('AI Provider')).toBeInTheDocument();
        expect(screen.getByText('Artifacts')).toBeInTheDocument();
        expect(screen.getByText('Data')).toBeInTheDocument();
        expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('requests settings on mount', () => {
        render(<SettingsView postMessage={mockPostMessage} />);
        expect(mockPostMessage).toHaveBeenCalledWith({ type: 'get-settings' });
    });

    it('renders save button', () => {
        render(<SettingsView postMessage={mockPostMessage} />);
        expect(screen.getByText('Save Settings')).toBeInTheDocument();
    });

    it('shows permissions toggles in general section', () => {
        render(<SettingsView postMessage={mockPostMessage} />);
        expect(screen.getByText('Auto Read Files')).toBeInTheDocument();
        expect(screen.getByText('Auto Write Files')).toBeInTheDocument();
        expect(screen.getByText('Auto Execute Commands')).toBeInTheDocument();
    });

    it('shows rate limits section', () => {
        render(<SettingsView postMessage={mockPostMessage} />);
        expect(screen.getByText('Rate Limits')).toBeInTheDocument();
        expect(screen.getByText('Token Limit')).toBeInTheDocument();
    });

    it('can navigate between sections', () => {
        render(<SettingsView postMessage={mockPostMessage} />);

        // Click on AI Provider section
        fireEvent.click(screen.getByText('AI Provider'));

        // Should show provider options
        expect(screen.getByText('🔮 Google Gemini')).toBeInTheDocument();
        expect(screen.getByText('☁️ AWS Bedrock')).toBeInTheDocument();
    });

    it('shows about section with version', () => {
        render(<SettingsView postMessage={mockPostMessage} />);

        // Click on About section
        fireEvent.click(screen.getByText('About'));

        // Should show version
        expect(screen.getByText('About Personaut')).toBeInTheDocument();
        expect(screen.getByText('Version 0.1.4')).toBeInTheDocument();
    });

    it('calls onSettingsChanged when save is clicked', () => {
        const onSettingsChanged = jest.fn();
        render(
            <SettingsView
                postMessage={mockPostMessage}
                onSettingsChanged={onSettingsChanged}
            />
        );

        fireEvent.click(screen.getByText('Save Settings'));

        expect(mockPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'save-settings' })
        );
    });
});

describe('SettingsView Provider Selection', () => {
    const mockPostMessage = jest.fn();

    it('can switch between Gemini and Bedrock', () => {
        render(<SettingsView postMessage={mockPostMessage} />);

        // Navigate to provider section
        fireEvent.click(screen.getByText('AI Provider'));

        // Click on Bedrock
        fireEvent.click(screen.getByText('☁️ AWS Bedrock'));

        // Should show AWS options
        expect(screen.getByText('Use AWS Profile')).toBeInTheDocument();
    });

    it('shows model selection for Gemini', () => {
        render(<SettingsView postMessage={mockPostMessage} />);

        // Navigate to provider section
        fireEvent.click(screen.getByText('AI Provider'));

        // Should show Gemini model options
        expect(screen.getByText('Model')).toBeInTheDocument();
    });
});
