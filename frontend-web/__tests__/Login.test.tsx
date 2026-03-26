import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Login from '../pages/Login';

// Mock the auth store
jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

const mockLogin = jest.fn();

describe('Login Page', () => {
  beforeEach(() => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: false,
    });
  });

  test('renders login form correctly', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/اسم المستخدم أو البريد/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/كلمة المرور/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تسجيل الدخول/i })).toBeInTheDocument();
  });

  test('calls login function with credentials', async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/اسم المستخدم أو البريد/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/كلمة المرور/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /تسجيل الدخول/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
    });
  });

  test('disables button when loading', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: true,
    });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /جاري تسجيل الدخول/i })).toBeDisabled();
  });
});