import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EducationProvider, useEducation } from '../components/providers/EducationProvider';

// Test consumer to consume and test the useEducation state hook
function TestConsumer() {
  const { isOpen, activeKey, activeCategory, contextData, openEducation, closeEducation } = useEducation();

  return (
    <div>
      <div data-testid="is-open">{isOpen ? 'OPEN' : 'CLOSED'}</div>
      <div data-testid="active-key">{activeKey || 'NONE'}</div>
      <div data-testid="active-category">{activeCategory}</div>
      <div data-testid="context-ticker">{contextData?.ticker || 'NONE'}</div>
      <div data-testid="context-price">{contextData?.currentPrice || 'NONE'}</div>
      
      <button 
        data-testid="open-btn" 
        onClick={() => openEducation('MONTE_CARLO', 'QUANT', { ticker: 'TSLA', currentPrice: 250 })}
      >
        Open TSLA MC
      </button>
      <button 
        data-testid="close-btn" 
        onClick={closeEducation}
      >
        Close
      </button>
    </div>
  );
}

describe('Dynamic Education Context Provider Flow', () => {
  it('correctly initializes, opens, and closes with dynamic context data', () => {
    render(
      <EducationProvider>
        <TestConsumer />
      </EducationProvider>
    );

    // Initial state verification
    expect(screen.getByTestId('is-open').textContent).toBe('CLOSED');
    expect(screen.getByTestId('active-key').textContent).toBe('NONE');
    expect(screen.getByTestId('context-ticker').textContent).toBe('NONE');

    // Trigger open with custom context data
    fireEvent.click(screen.getByTestId('open-btn'));

    // Assert states are dynamically populated in the provider
    expect(screen.getByTestId('is-open').textContent).toBe('OPEN');
    expect(screen.getByTestId('active-key').textContent).toBe('MONTE_CARLO');
    expect(screen.getByTestId('active-category').textContent).toBe('QUANT');
    expect(screen.getByTestId('context-ticker').textContent).toBe('TSLA');
    expect(screen.getByTestId('context-price').textContent).toBe('250');

    // Trigger close action
    fireEvent.click(screen.getByTestId('close-btn'));

    // Assert states are cleaned up
    expect(screen.getByTestId('is-open').textContent).toBe('CLOSED');
    expect(screen.getByTestId('context-ticker').textContent).toBe('NONE');
  });
});
