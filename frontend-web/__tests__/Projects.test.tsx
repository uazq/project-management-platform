import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Projects from '../pages/Projects';
import api from '../services/api';

jest.mock('../services/api');

const mockProjects = [
  {
    id: 1,
    name: 'مشروع 1',
    description: 'وصف المشروع 1',
    status: 'active',
    startDate: '2025-01-01',
    _count: { tasks: 5, members: 3 },
  },
  {
    id: 2,
    name: 'مشروع 2',
    description: 'وصف المشروع 2',
    status: 'completed',
    startDate: '2025-02-01',
    _count: { tasks: 2, members: 4 },
  },
];

describe('Projects Page', () => {
  beforeEach(() => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockProjects });
  });

  test('renders projects list', async () => {
    render(
      <BrowserRouter>
        <Projects />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('مشروع 1')).toBeInTheDocument();
      expect(screen.getByText('مشروع 2')).toBeInTheDocument();
    });
  });

  test('displays correct status badges', async () => {
    render(
      <BrowserRouter>
        <Projects />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('نشط')).toBeInTheDocument();
      expect(screen.getByText('منجز')).toBeInTheDocument();
    });
  });
});