import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import mixedEntities from '../fixtures/mixed-entities.gpx?raw';

vi.mock('../../src/components/map/ActivityMap', () => ({
  ActivityMap: () => <div data-testid="mock-map">mock map vector geometry</div>,
}));

import App from '../../src/App';

describe('import flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the bundled demo through the app pipeline', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(mixedEntities, { status: 200, headers: { 'Content-Type': 'application/gpx+xml' } }),
    );
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /load demo/i }));

    expect(await screen.findByTestId('mock-map')).toBeInTheDocument();
    expect(screen.getByText(/Track distance/i)).toBeInTheDocument();
    expect(screen.getByText(/GPX structure/i)).toBeInTheDocument();
    expect(screen.getByText(/Elevation profile/i)).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}sample/demo.gpx`, { cache: 'no-store' });
  });

  it('reads a local GPX file without calling fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<App />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([mixedEntities], 'private-activity.gpx', { type: 'application/gpx+xml' });
    await userEvent.upload(input, file);

    await waitFor(() => expect(screen.getByTestId('mock-map')).toBeInTheDocument());
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
