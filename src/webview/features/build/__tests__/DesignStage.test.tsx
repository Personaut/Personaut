import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DesignStage } from '../stages/DesignStage';

describe('DesignStage', () => {
    const defaultProps = {
        userFlows: [],
        onFlowsChange: jest.fn(),
        screens: [],
        onScreensChange: jest.fn(),
        selectedFramework: 'react' as const,
        onFrameworkChange: jest.fn(),
        onGenerateFlows: jest.fn(),
        onGenerateScreens: jest.fn(),
        onNext: jest.fn(),
        onBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the stage title', () => {
        render(<DesignStage {...defaultProps} />);
        // Use heading role to get the specific title
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Design');
    });

    it('renders framework selector', () => {
        render(<DesignStage {...defaultProps} />);
        expect(screen.getByText('React')).toBeInTheDocument();
        expect(screen.getByText('Next.js')).toBeInTheDocument();
        expect(screen.getByText('Vue.js')).toBeInTheDocument();
        expect(screen.getByText('Flutter')).toBeInTheDocument();
        expect(screen.getByText('HTML/CSS/JS')).toBeInTheDocument();
    });

    it('highlights selected framework', () => {
        render(<DesignStage {...defaultProps} selectedFramework="react" />);
        const reactCard = screen.getByText('React').closest('div');
        expect(reactCard).toHaveStyle({ borderColor: expect.stringContaining('rgb') });
    });

    it('calls onFrameworkChange when framework is selected', () => {
        render(<DesignStage {...defaultProps} />);
        const vueCard = screen.getByText('Vue.js').closest('div');
        fireEvent.click(vueCard!);
        expect(defaultProps.onFrameworkChange).toHaveBeenCalledWith('vue');
    });

    it('renders generate flows button', () => {
        render(<DesignStage {...defaultProps} />);
        expect(screen.getByRole('button', { name: /Generate Flows/i })).toBeInTheDocument();
    });

    it('calls onGenerateFlows when button is clicked', () => {
        render(<DesignStage {...defaultProps} />);
        const button = screen.getByRole('button', { name: /Generate Flows/i });
        fireEvent.click(button);
        expect(defaultProps.onGenerateFlows).toHaveBeenCalled();
    });

    it('displays user flows', () => {
        const userFlows = [
            {
                id: '1',
                name: 'Login Flow',
                description: 'User login process',
                steps: ['Enter email', 'Enter password', 'Click submit'],
            },
        ];
        render(<DesignStage {...defaultProps} userFlows={userFlows} />);
        expect(screen.getByText('Login Flow')).toBeInTheDocument();
        expect(screen.getByText('User login process')).toBeInTheDocument();
    });

    it('displays flow steps', () => {
        const userFlows = [
            {
                id: '1',
                name: 'Login Flow',
                description: 'User login process',
                steps: ['Enter email', 'Enter password', 'Click submit'],
            },
        ];
        render(<DesignStage {...defaultProps} userFlows={userFlows} />);
        expect(screen.getByText('Enter email')).toBeInTheDocument();
        expect(screen.getByText('Enter password')).toBeInTheDocument();
        expect(screen.getByText('Click submit')).toBeInTheDocument();
    });

    it('renders generate screens button', () => {
        const userFlows = [{ id: '1', name: 'Flow', description: 'A flow', steps: ['Step 1'] }];
        render(<DesignStage {...defaultProps} userFlows={userFlows} />);
        expect(screen.getByRole('button', { name: /Generate Screens/i })).toBeInTheDocument();
    });

    it('displays screens', () => {
        const screens = [
            {
                id: '1',
                name: 'Home Screen',
                description: 'Main home view',
                components: ['Header', 'Content', 'Footer'],
                flowId: '1',
            },
        ];
        render(<DesignStage {...defaultProps} screens={screens} />);
        expect(screen.getByText('Home Screen')).toBeInTheDocument();
        expect(screen.getByText('3 components')).toBeInTheDocument();
    });

    it('disables Next button when invalid', () => {
        render(<DesignStage {...defaultProps} />);
        const nextButton = screen.getByRole('button', { name: /Continue to Build/i });
        expect(nextButton).toBeDisabled();
    });

    it('enables Next button when valid', () => {
        const userFlows = [{ id: '1', name: 'Flow', description: 'A flow', steps: ['Step 1'] }];
        const screens = [
            { id: '1', name: 'Screen', description: 'A screen', components: ['C1'], flowId: '1' },
        ];
        render(<DesignStage {...defaultProps} userFlows={userFlows} screens={screens} />);
        const nextButton = screen.getByRole('button', { name: /Continue to Build/i });
        expect(nextButton).not.toBeDisabled();
    });

    it('calls onBack when Back button is clicked', () => {
        render(<DesignStage {...defaultProps} />);
        const backButton = screen.getByRole('button', { name: /Back/i });
        fireEvent.click(backButton);
        expect(defaultProps.onBack).toHaveBeenCalled();
    });
});
