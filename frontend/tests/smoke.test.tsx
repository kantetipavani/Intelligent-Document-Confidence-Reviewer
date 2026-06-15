import { render, screen } from '@testing-library/react';
import React from 'react';

function SmokeComponent() {
  return <div>Smoke Test OK</div>;
}

describe('frontend smoke tests', () => {
  it('renders component', () => {
    render(<SmokeComponent />);
    expect(screen.getByText('Smoke Test OK')).toBeInTheDocument();
  });
});

